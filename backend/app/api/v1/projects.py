from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus
from app.models.project_member import ProjectMember, ProjectMemberStatus

from app.models.invitation import Invitation, InvitationStatus
from app.core.dependencies import get_current_user, require_chef_projet_or_admin, require_project_access
from app.core.security import generate_invitation_token, hash_token
from app.core.config import settings
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse
from app.schemas.project_member import ProjectMemberCreate, ProjectMemberResponse, ProjectMemberListResponse
from app.services.email_service import get_email_provider, get_invitation_email_template, get_notification_email_template
from app.services.notification_service import create_notification
from app.models.atelier1 import CadrageAtelier1
from app.models.raci import RACIAssignment
from app.models.notification import Notification
from app.core.raci_defaults import populate_default_raci


router = APIRouter()


def ensure_project_is_open(project: Project):
    if project.statut in [ProjectStatus.TERMINE, ProjectStatus.ARCHIVE]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Project is closed')


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_chef_projet_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new project (chef de projet or admin)."""
    # Validate additional assignment inputs (client + consultants)
    client_id = project_data.client_id
    consultant_ids = project_data.consultant_ids or []

    if client_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="client_id is required",
        )

    # Validate client
    client_result = await db.execute(select(User).where(User.id == client_id))
    client_user = client_result.scalar_one_or_none()
    if not client_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if client_user.role != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="client_id must belong to a user with role CLIENT",
        )

    # Validate consultants
    consultant_users: list[User] = []
    for cid in consultant_ids:
        consultant_result = await db.execute(select(User).where(User.id == cid))
        consultant_user = consultant_result.scalar_one_or_none()
        if not consultant_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Consultant not found: {cid}")
        if consultant_user.role != UserRole.CONSULTANT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"consultant_ids must be users with role CONSULTANT. Invalid id: {cid}",
            )
        consultant_users.append(consultant_user)

    new_project = Project(
        nom=project_data.nom,
        description=project_data.description,
        domaine=project_data.domaine,
        statut=project_data.statut,
        methode_cotation=project_data.methode_cotation,
        chef_de_projet_id=current_user.id,
        client_id=client_user.id,
        consultants_ids=[str(c.id) for c in consultant_users],
    )
    db.add(new_project)
    await db.flush()

    # Auto-add chef de projet as accepted member
    chef_member = ProjectMember(
        project_id=new_project.id,
        user_id=current_user.id,
        project_role="CHEF_PROJET",
        status=ProjectMemberStatus.ACCEPTED,
    )
    db.add(chef_member)

    # Add client as accepted member
    client_member = ProjectMember(
        project_id=new_project.id,
        user_id=client_user.id,
        project_role="CLIENT",
        status=ProjectMemberStatus.ACCEPTED,
    )
    db.add(client_member)

    # Create atelier1 cadrage row upfront (avoid 500 on GET /{project_id}/atelier1/cadrage)
    db.add(CadrageAtelier1(project_id=new_project.id))

    # Add consultants as pending + notifications (reuse same logic as add_team_member)
    for consultant_user in consultant_users:
        # prevent duplicates

        existing_result = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == new_project.id,
                ProjectMember.user_id == consultant_user.id,
            )
        )
        if existing_result.scalar_one_or_none():
            continue

        pending_member = ProjectMember(
            project_id=new_project.id,
            user_id=consultant_user.id,
            project_role="CONSULTANT",
            status=ProjectMemberStatus.PENDING,
        )
        db.add(pending_member)

    await db.commit()

    # ✨ Pré-remplir la matrice RACI avec les défauts
    await populate_default_raci(db, new_project.id, current_user, client_user, consultant_users)

    # Notifications must be sent after commit (members exist)

    # We re-fetch last members for correct responses, but notifications can use consultant_user + project_id.
    for consultant_user in consultant_users:
        await create_notification(
            db=db,
            user_id=consultant_user.id,
            notification_type="MISSION_ASSIGNED",
            message=f"Vous avez été assigné au projet '{new_project.nom}'",
            related_project_id=str(new_project.id),
            background_tasks=background_tasks,
        )

    # Notify client too
    await create_notification(
        db=db,
        user_id=client_user.id,
        notification_type="MISSION_ASSIGNED",
        message=f"Vous avez été assigné au projet '{new_project.nom}'",
        related_project_id=str(new_project.id),
        background_tasks=background_tasks,
    )


    await db.refresh(new_project)

    return new_project



@router.get("", response_model=ProjectListResponse)
async def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    statut: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List projects based on user role."""
    query = select(Project)
    
    # Filter based on user role
    if current_user.role == UserRole.ADMIN:
        # Admin sees all projects
        pass
    elif current_user.role == UserRole.CHEF_PROJET:
        # Chef de projet sees their own projects
        query = query.where(Project.chef_de_projet_id == current_user.id)
    elif current_user.role == UserRole.CONSULTANT:
        # Consultant sees projects they are members of (ACCEPTED)
        query = query.join(ProjectMember).where(
            ProjectMember.user_id == current_user.id,
            ProjectMember.status == ProjectMemberStatus.ACCEPTED
        )
    elif current_user.role == UserRole.CLIENT:
        # Client sees projects they are members of (ACCEPTED)
        query = query.join(ProjectMember).where(
            ProjectMember.user_id == current_user.id,
            ProjectMember.status == ProjectMemberStatus.ACCEPTED
        )

    
    # Apply additional filters
    if statut:
        query = query.where(Project.statut == statut)
    if search:
        query = query.where(
            or_(
                Project.nom.ilike(f"%{search}%"),
                Project.description.ilike(f"%{search}%"),
                Project.domaine.ilike(f"%{search}%")
            )
        )
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(Project.created_at.desc())
    
    result = await db.execute(query)
    projects = result.scalars().all()
    
    return ProjectListResponse(
        projects=projects,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    project: Project = Depends(require_project_access),
    db: AsyncSession = Depends(get_db)
):
    """Get project by ID."""
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update project."""
    project = await require_project_access(project_id, current_user, db)
    
    # Only chef de projet or admin can update
    if current_user.role not in [UserRole.ADMIN, UserRole.CHEF_PROJET]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only chef de projet or admin can update projects"
        )
    
    # If chef de projet, verify they own this project
    if current_user.role == UserRole.CHEF_PROJET and project.chef_de_projet_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own projects"
        )
    
    # Update fields
    update_data = project_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    await db.commit()
    await db.refresh(project)
    
    return project


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete project."""
    project = await require_project_access(project_id, current_user, db)
    
    # Only chef de projet or admin can delete
    if current_user.role not in [UserRole.ADMIN, UserRole.CHEF_PROJET]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only chef de projet or admin can delete projects"
        )
    
    # If chef de projet, verify they own this project
    if current_user.role == UserRole.CHEF_PROJET and project.chef_de_projet_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own projects"
        )
    
    # Delete related records first (cascade delete would also work but explicit is clearer)
    # Delete project members
    await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id)
    )
    for member in (await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id)
    )).scalars().all():
        await db.delete(member)
    
    # Delete RACI assignments
    await db.execute(
        select(RACIAssignment).where(RACIAssignment.project_id == project_id)
    )
    for assignment in (await db.execute(
        select(RACIAssignment).where(RACIAssignment.project_id == project_id)
    )).scalars().all():
        await db.delete(assignment)
    
    # Delete notifications related to this project
    await db.execute(
        select(Notification).where(Notification.related_project_id == project_id)
    )
    for notification in (await db.execute(
        select(Notification).where(Notification.related_project_id == project_id)
    )).scalars().all():
        await db.delete(notification)
    
    # Delete cadrage atelier1 if exists
    await db.execute(
        select(CadrageAtelier1).where(CadrageAtelier1.project_id == project_id)
    )
    cadrage = (await db.execute(
        select(CadrageAtelier1).where(CadrageAtelier1.project_id == project_id)
    )).scalar_one_or_none()
    if cadrage:
        await db.delete(cadrage)
    
    # Delete the project
    await db.delete(project)
    await db.commit()
    
    return {"message": "Project deleted successfully"}


@router.post("/{project_id}/team", response_model=ProjectMemberResponse)
async def add_team_member(
    project_id: str,
    member_data: ProjectMemberCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a consultant to the project team."""
    project = await require_project_access(project_id, current_user, db)
    
    ensure_project_is_open(project)

    # Only chef de projet or admin can add team members
    if current_user.role not in [UserRole.ADMIN, UserRole.CHEF_PROJET]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only chef de projet or admin can add team members"
    )
    
    # If chef de projet, verify they own this project
    if current_user.role == UserRole.CHEF_PROJET and project.chef_de_projet_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only add members to your own projects"
        )
    
    # Verify user exists and is a consultant
    user_result = await db.execute(select(User).where(User.id == member_data.user_id))
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.role != UserRole.CONSULTANT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only consultants can be added to project team"
        )
    
    # Check if user is already a member
    existing_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == member_data.user_id
        )
    )
    existing_member = existing_result.scalar_one_or_none()
    
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this project"
        )
    
    # Create project member
    new_member = ProjectMember(
        project_id=project_id,
        user_id=member_data.user_id,
        project_role="CONSULTANT",
        status=ProjectMemberStatus.PENDING
    )

    db.add(new_member)
    await db.commit()
    await db.refresh(new_member)
    
    # Send notification to consultant
    await create_notification(
        db=db,
        user_id=user.id,
        notification_type="MISSION_ASSIGNED",
        message=f"Vous avez ÃƒÆ’Ã‚Â©tÃƒÆ’Ã‚Â© assignÃƒÆ’Ã‚Â© au projet '{project.nom}'",
        related_project_id=project_id,
        background_tasks=background_tasks
    )
    
    # Populate user info for response
    new_member.user_email = user.email
    new_member.user_first_name = user.first_name
    new_member.user_last_name = user.last_name
    
    return new_member


@router.get("/{project_id}/members", response_model=ProjectMemberListResponse)
async def list_project_members(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List project team members."""
    project = await require_project_access(project_id, current_user, db)
    
    # Get all members
    result = await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id)
    )
    members = result.scalars().all()

    
    # Populate user info for each member
    member_responses = []
    for member in members:
        user_result = await db.execute(select(User).where(User.id == member.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            member.user_email = user.email
            member.user_first_name = user.first_name
            member.user_last_name = user.last_name
            member_responses.append(member)
    
    return ProjectMemberListResponse(
        members=member_responses,
        total=len(member_responses)
    )


@router.delete("/{project_id}/team/{user_id}")
async def remove_team_member(
    project_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a consultant from the project team."""
    project = await require_project_access(project_id, current_user, db)
    
    # Only chef de projet or admin can remove team members
    if current_user.role not in [UserRole.ADMIN, UserRole.CHEF_PROJET]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only chef de projet or admin can remove team members"
        )
    
    # If chef de projet, verify they own this project
    if current_user.role == UserRole.CHEF_PROJET and project.chef_de_projet_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only remove members from your own projects"
        )
    
    # Find and delete member
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        )
    )
    member = result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found"
        )
    
    await db.delete(member)
    await db.commit()
    
    return {"message": "Team member removed successfully"}


@router.post("/{project_id}/invite-client")
async def invite_client_to_project(
    project_id: str,
    client_email: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Invite or attach a client to a project."""
    project = await require_project_access(project_id, current_user, db)
    
    ensure_project_is_open(project)

    # Only chef de projet or admin can invite clients
    if current_user.role not in [UserRole.ADMIN, UserRole.CHEF_PROJET]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only chef de projet or admin can invite clients"
        )
    
    # If chef de projet, verify they own this project
    if current_user.role == UserRole.CHEF_PROJET and project.chef_de_projet_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only invite clients to your own projects"
        )
    
    # Check if user exists
    user_result = await db.execute(select(User).where(User.email == client_email))
    user = user_result.scalar_one_or_none()
    
    if user:
        # Verify existing user is a client from the same organization
        if user.role != UserRole.CLIENT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a client"
            )
        

        
        # Send notification to existing client
        await create_notification(
            db=db,
            user_id=user.id,
            notification_type="INVITATION",
            message=f"Vous avez ÃƒÆ’Ã‚Â©tÃƒÆ’Ã‚Â© invitÃƒÆ’Ã‚Â© au projet '{project.nom}'",
            related_project_id=project_id,
            background_tasks=background_tasks
        )
    else:
        # Create new client user via invitation flow
        from app.models.user import UserStatus
        from datetime import datetime, timedelta
        
        new_user = User(
            email=client_email,
            first_name="",
            last_name="",
            role=UserRole.CLIENT,
            status=UserStatus.INVITED
        )

        db.add(new_user)
        await db.flush()
        
        # Generate invitation token
        token = generate_invitation_token()
        token_hash = hash_token(token)
        expires_at = datetime.utcnow() + timedelta(hours=settings.invitation_expire_hours)
        
        # Create invitation record
        invitation = Invitation(
            email=client_email,
            role=UserRole.CLIENT.value,
            token_hash=token_hash,
            project_id=project_id,
            invited_by_id=current_user.id,
            expires_at=expires_at,
            status=InvitationStatus.PENDING
        )
        db.add(invitation)
        await db.commit()
        
        # Send invitation email
        email_provider = get_email_provider()
        invitation_link = f"{settings.cors_origins[0]}/accept-invitation?token={token}"
        subject, text_content, html_content = get_invitation_email_template(invitation_link, "CLIENT")
        
        background_tasks.add_task(
            email_provider.send_email,
            to_email=client_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
    
    return {"message": "Client invited successfully"}
