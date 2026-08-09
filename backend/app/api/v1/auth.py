from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from slowapi import Limiter
from slowapi.util import get_remote_address
from datetime import datetime, timedelta
from app.db.session import get_db
from app.models.user import User, UserStatus
from app.models.invitation import Invitation, InvitationStatus
from app.models.project_member import ProjectMember, ProjectMemberStatus

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    generate_invitation_token,
    hash_token,
    verify_token,
    generate_password_reset_token
)
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    AcceptInvitationRequest,
    AcceptInvitationBodyRequest,
    InvitationVerifyResponse
)

from app.services.email_service import (
    get_email_provider,
    get_invitation_email_template,
    get_password_reset_email_template
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.rate_limit_login)
async def login(
    request: Request,
    credentials: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return tokens."""
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    
    # Never call passlib verification with an invalid hash (e.g. NULL for INVITED users)
    if not user or not user.hashed_password or user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    
    # Update last login
    user.last_login_at = datetime.utcnow()
    await db.commit()
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Set refresh token as httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60
    )
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value
        }
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    refresh_token: str = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token from cookie."""
    from app.core.dependencies import get_user_from_refresh_token
    
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )
    
    user = await get_user_from_refresh_token(refresh_token, db=db)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Create new tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Update refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60
    )
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value
        }
    )


@router.post("/logout")
async def logout(response: Response):
    """Logout user by clearing refresh token cookie."""
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=True,
        samesite="strict"
    )
    return {"message": "Successfully logged out"}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "role": current_user.role.value,
        "status": current_user.status.value,
        "created_at": current_user.created_at,
        "last_login_at": current_user.last_login_at
    }


@router.post("/forgot-password")
@limiter.limit(settings.rate_limit_forgot_password)
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Send password reset email (always returns 200 for security)."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    
    if user and user.status == UserStatus.ACTIVE:
        # Generate reset token
        token = generate_password_reset_token()
        token_hash = hash_token(token)
        expires_at = datetime.utcnow() + timedelta(hours=settings.password_reset_expire_hours)
        
        # Store in invitations table as a password reset
        invitation = Invitation(
            email=user.email,
            role="PASSWORD_RESET",
            token_hash=token_hash,
            invited_by_id=user.id,
            expires_at=expires_at,
            status=InvitationStatus.PENDING
        )
        db.add(invitation)
        await db.commit()
        
        # Send email
        email_provider = get_email_provider()
        reset_link = f"{settings.cors_origins[0]}/reset-password?token={token}"
        subject, text_content, html_content = get_password_reset_email_template(reset_link)
        
        background_tasks.add_task(
            email_provider.send_email,
            to_email=user.email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
    
    # Always return 200 to prevent email enumeration
    return {"message": "If an account exists with this email, a password reset link has been sent"}


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Reset password using token."""
    result = await db.execute(
        select(Invitation).where(
            Invitation.token_hash == hash_token(request.token),
            Invitation.role == "PASSWORD_RESET",
            Invitation.status == InvitationStatus.PENDING
        )
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation or invitation.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update user password
    user_result = await db.execute(select(User).where(User.email == invitation.email))
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )
    
    user.hashed_password = get_password_hash(request.new_password)
    invitation.status = InvitationStatus.ACCEPTED
    await db.commit()
    
    return {"message": "Password reset successfully"}


@router.get("/invitations/{token}", response_model=InvitationVerifyResponse)
async def verify_invitation(token: str, db: AsyncSession = Depends(get_db)):
    """Verify invitation token validity."""
    import logging
    logger = logging.getLogger(__name__)

    token_hash = hash_token(token)
    result = await db.execute(
        select(Invitation).where(
            Invitation.token_hash == token_hash,
            Invitation.status == InvitationStatus.PENDING
        )
    )
    invitation = result.scalar_one_or_none()

    now = datetime.utcnow()

    if not invitation:
        logger.info("verify_invitation: not found (or not pending). token=%s", token)
        return InvitationVerifyResponse(valid=False, email=None, role=None, expires_at=None)

    expired = invitation.expires_at < now
    logger.info(
        "verify_invitation: found invitation. token=%s status=%s expires_at=%s now=%s expired=%s",
        token,
        invitation.status,
        invitation.expires_at.isoformat(),
        now.isoformat(),
        expired,
    )

    if expired:
        return InvitationVerifyResponse(valid=False, email=None, role=None, expires_at=None)

    return InvitationVerifyResponse(
        valid=True,
        email=invitation.email,
        role=invitation.role,
        expires_at=invitation.expires_at.isoformat()
    )


@router.post("/accept-invitation/{token}")
async def accept_invitation(
    token: str,
    request: AcceptInvitationBodyRequest,
    db: AsyncSession = Depends(get_db)
):

    """Accept invitation and set password."""
    result = await db.execute(
        select(Invitation).where(
            Invitation.token_hash == hash_token(token),
            Invitation.status == InvitationStatus.PENDING
        )
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation or invitation.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired invitation token"
        )
    
    # Check if user already exists
    user_result = await db.execute(select(User).where(User.email == invitation.email))
    user = user_result.scalar_one_or_none()
    
    if user:
        # Update existing user
        user.hashed_password = get_password_hash(request.password)
        user.status = UserStatus.ACTIVE
    else:
        # Create new user
        user = User(
            email=invitation.email,
            hashed_password=get_password_hash(request.password),
            first_name="",  # Will be set by admin
            last_name="",
            role=invitation.role,
            status=UserStatus.ACTIVE
        )
        db.add(user)
        # Force SQLAlchemy to flush so user.id is available for ProjectMember
        await db.flush()


    # Link user to the invited project (if provided)

    if invitation.project_id:
        # If the member already exists, do nothing (idempotent)
        member_check = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == invitation.project_id,
                ProjectMember.user_id == user.id,
            )
        )
        existing_member = member_check.scalar_one_or_none()

        if not existing_member:
            db.add(
                ProjectMember(
                    project_id=invitation.project_id,
                    user_id=user.id,
                    project_role="CONSULTANT"

                )
            )

    invitation.status = InvitationStatus.ACCEPTED
    await db.commit()
    
    return {"message": "Account activated successfully"}

