from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus
from app.models.project_member import ProjectMember, ProjectMemberStatus
from app.core.dependencies import get_current_user, require_project_access
from app.schemas.project import ProjectResponse
from app.schemas.project_member import ProjectMemberResponse
from app.services.notification_service import create_notification

router = APIRouter()


@router.get("", response_model=list[dict])
async def list_missions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List projects where the user is a team member (consultant only)."""
    if current_user.role != UserRole.CONSULTANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only consultants can view missions"
        )
    
    # Get all project memberships for this consultant
    result = await db.execute(
        select(ProjectMember).where(ProjectMember.user_id == current_user.id)
    )
    memberships = result.scalars().all()
    
    missions = []
    for membership in memberships:
        # Get project details
        project_result = await db.execute(
            select(Project).where(Project.id == membership.project_id)
        )
        project = project_result.scalar_one_or_none()
        
        if project:
            missions.append({
                "project": {
                    "id": str(project.id),
                    "nom": project.nom,
                    "description": project.description,
                    "domaine": project.domaine,
                    "statut": project.statut.value,
                    "methode_cotation": project.methode_cotation,
                    "chef_de_projet_id": str(project.chef_de_projet_id),
                    "created_at": project.created_at,
                    "updated_at": project.updated_at
                },
                "membership": {
                    "id": str(membership.id),
                    "status": membership.status.value,
                    "invited_at": membership.invited_at,
                    "responded_at": membership.responded_at
                }
            })
    
    return missions


@router.post("/projects/{project_id}/accept")
async def accept_mission(
    project_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Accept a mission invitation."""
    if current_user.role != UserRole.CONSULTANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only consultants can accept missions"
        )
    
    # Get project membership
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    )
    membership = result.scalar_one_or_none()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mission invitation not found"
        )
    
    if membership.status != ProjectMemberStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mission has already been responded to"
        )
    
    # Update membership status
    membership.status = ProjectMemberStatus.ACCEPTED
    membership.responded_at = datetime.utcnow()
    
    # Get project details for notification
    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one_or_none()
    
    if project:
        if project.statut == ProjectStatus.BROUILLON:
            project.statut = ProjectStatus.EN_COURS
        # Notify chef de projet
        await create_notification(
            db=db,
            user_id=project.chef_de_projet_id,
            notification_type="MISSION_ACCEPTED",
            message=f"Le consultant {current_user.first_name} {current_user.last_name} a acceptÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© la mission pour le projet '{project.nom}'",
            related_project_id=project_id,
            background_tasks=background_tasks
        )
    
    await db.commit()
    
    return {"message": "Mission accepted successfully"}


@router.post("/projects/{project_id}/decline")
async def decline_mission(
    project_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Decline a mission invitation."""
    if current_user.role != UserRole.CONSULTANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only consultants can decline missions"
        )
    
    # Get project membership
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id
        )
    )
    membership = result.scalar_one_or_none()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mission invitation not found"
        )
    
    if membership.status != ProjectMemberStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mission has already been responded to"
        )
    
    # Update membership status
    membership.status = ProjectMemberStatus.DECLINED
    membership.responded_at = datetime.utcnow()
    
    # Get project details for notification
    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one_or_none()
    
    if project:
        # Notify chef de projet
        await create_notification(
            db=db,
            user_id=project.chef_de_projet_id,
            notification_type="MISSION_DECLINED",
            message=f"Le consultant {current_user.first_name} {current_user.last_name} a dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©clinÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© la mission pour le projet '{project.nom}'",
            related_project_id=project_id,
            background_tasks=background_tasks
        )
    
    await db.commit()
    
    return {"message": "Mission declined successfully"}
