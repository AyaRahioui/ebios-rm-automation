from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.models.project import Project
from app.services.email_service import get_email_provider, get_notification_email_template


async def create_notification(
    db: AsyncSession,
    user_id: str,
    notification_type: str,
    message: str,
    related_project_id: str = None,
    payload: dict = None,
    background_tasks: BackgroundTasks = None
):
    """Create an in-app notification and optionally send email."""
    # Create notification record
    notification = Notification(
        user_id=user_id,
        type=NotificationType(notification_type),
        message=message,
        payload=payload,
        related_project_id=related_project_id
    )
    db.add(notification)
    
    # Get user details for email
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    
    if user and background_tasks:
        # Get project name if available
        project_name = None
        if related_project_id:
            project_result = await db.execute(select(Project).where(Project.id == related_project_id))
            project = project_result.scalar_one_or_none()
            if project:
                project_name = project.nom
        
        # Send email notification
        email_provider = get_email_provider()
        subject, text_content, html_content = get_notification_email_template(
            notification_type=notification_type,
            message=message,
            project_name=project_name
        )
        
        background_tasks.add_task(
            email_provider.send_email,
            to_email=user.email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
