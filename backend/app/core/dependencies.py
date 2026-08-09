from typing import Optional, List
from fastapi import Depends, HTTPException, status, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User, UserRole, UserStatus
from app.models.project import Project
from app.models.project_member import ProjectMember, ProjectMemberStatus
from app.core.permissions import RACIPermission

from app.core.security import decode_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get the current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    token_type = payload.get("type")
    if token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active"
        )
    
    return user


async def get_user_from_refresh_token(
    refresh_token: str,
    db: AsyncSession
) -> Optional[User]:
    """Get user from a refresh token string."""
    payload = decode_token(refresh_token)
    if payload is None:
        return None
    
    user_id: str = payload.get("sub")
    if user_id is None:
        return None
    
    token_type = payload.get("type")
    if token_type != "refresh":
        return None
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    return user


async def get_current_user_from_refresh_token(
    refresh_token: str = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Get the current user from refresh token cookie (for use as dependency)."""
    if refresh_token is None:
        return None
    
    return await get_user_from_refresh_token(refresh_token, db)


def require_roles(*allowed_roles: UserRole):
    """Dependency to require specific user roles."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require admin role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def require_chef_projet_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require chef de projet or admin role."""
    if current_user.role not in [UserRole.ADMIN, UserRole.CHEF_PROJET]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chef de projet or admin access required"
        )
    return current_user


async def require_project_access(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Project:
    """Dependency to verify user has access to a specific project."""
    # Admins have access to all projects
    if current_user.role == UserRole.ADMIN:
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        return project
    
    # Chef de projet can access their own projects
    if current_user.role == UserRole.CHEF_PROJET:
        result = await db.execute(
            select(Project).where(
                Project.id == project_id,
                Project.chef_de_projet_id == current_user.id
            )
        )
        project = result.scalar_one_or_none()
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or access denied"
            )
        return project
    
    # Consultants can access projects they are members of (ACCEPTED)
    if current_user.role == UserRole.CONSULTANT:
        result = await db.execute(
            select(Project).join(ProjectMember).where(
                Project.id == project_id,
                ProjectMember.user_id == current_user.id,
                ProjectMember.status == ProjectMemberStatus.ACCEPTED
            )
        )
        project = result.scalar_one_or_none()
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or access denied"
            )
        return project
    
    # Clients can access projects they are members of (ACCEPTED)
    if current_user.role == UserRole.CLIENT:
        result = await db.execute(
            select(Project).join(ProjectMember).where(
                Project.id == project_id,
                ProjectMember.user_id == current_user.id,
                ProjectMember.status == ProjectMemberStatus.ACCEPTED
            )
        )

        project = result.scalar_one_or_none()
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or access denied"
            )
        return project
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied"
    )


async def require_project_membership(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ProjectMember:
    """Dependency to verify user is a member of a specific project."""
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    )
    member = result.scalar_one_or_none()
    
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this project"
        )
    
    return member


def get_raci_permission(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> RACIPermission:
    """Dependency FastAPI pour injecter le service RACI."""
    return RACIPermission(db, current_user, project_id)
