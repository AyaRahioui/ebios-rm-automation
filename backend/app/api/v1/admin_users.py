from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from datetime import datetime, timedelta
from app.db.session import get_db
from app.models.user import User, UserRole, UserStatus

from app.models.invitation import Invitation, InvitationStatus
from app.core.dependencies import require_admin, require_chef_projet_or_admin
from app.core.security import generate_invitation_token, hash_token
from app.core.config import settings
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse

from app.services.email_service import get_email_provider, get_invitation_email_template

router = APIRouter()


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new user and send invitation email."""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Creating user with email: {user_data.email}")
        
        # Check if email already exists
        result = await db.execute(select(User).where(User.email == user_data.email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            logger.warning(f"User with email {user_data.email} already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        

        
        # Create user with INVITED status (no password yet)
        new_user = User(
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=user_data.role,
            status=UserStatus.INVITED,
        )

        db.add(new_user)
        await db.flush()  # Get the user ID
        logger.info(f"User created with ID: {new_user.id}")
        
        # Generate invitation token
        token = generate_invitation_token()
        token_hash = hash_token(token)
        expires_at = datetime.utcnow() + timedelta(hours=settings.invitation_expire_hours)
        
        # Create invitation record
        invitation = Invitation(
            email=user_data.email,
            role=user_data.role.value,
            token_hash=token_hash,
            invited_by_id=current_user.id,
            expires_at=expires_at,
            status=InvitationStatus.PENDING
        )
        db.add(invitation)
        await db.commit()
        logger.info(f"Invitation created for user: {user_data.email}")
        
        # Send invitation email
        email_provider = get_email_provider()
        app_url = getattr(settings, "app_url", "http://localhost:5173")
        invitation_link = f"{app_url}/accept-invitation?token={token}"
        subject, text_content, html_content = get_invitation_email_template(invitation_link, user_data.role.value)
        
        activation_link: Optional[str] = None
        # In LOCAL_DISPLAY/CONSOLE mode, return the activation link to the frontend.
        # In SMTP mode, never return it (frontend will just show that the email was sent).
        if settings.email_mode != "SMTP":
            await email_provider.send_email(
                to_email=user_data.email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            # Prefer provider-based extraction when available
            if hasattr(email_provider, "get_last_link"):
                activation_link = email_provider.get_last_link()
            # Fallback: compute from token
            if not activation_link:
                activation_link = invitation_link
            logger.info(f"Activation link: {activation_link}")
        else:
            background_tasks.add_task(
                email_provider.send_email,
                to_email=user_data.email,
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            activation_link = None

        
        await db.refresh(new_user)
        
        # Return user with activation link in LOCAL_DISPLAY mode
        response = UserResponse(
            id=new_user.id,
            email=new_user.email,
            first_name=new_user.first_name,
            last_name=new_user.last_name,
            role=new_user.role.value,
            status=new_user.status.value,

            created_at=new_user.created_at,
            updated_at=new_user.updated_at,
            activation_link=activation_link
        )
        logger.info(f"Returning response for user: {user_data.email}")
        return response
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}", exc_info=True)
        raise


@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    role: Optional[UserRole] = None,
    status: Optional[UserStatus] = None,
    search: Optional[str] = None,

    current_user: User = Depends(require_chef_projet_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """List users with pagination and filters."""
    # Build query
    query = select(User)
    

    # Apply filters
    if role:

        query = query.where(User.role == role)
    if status:
        query = query.where(User.status == status)
    if search:
        query = query.where(

            or_(
                User.email.ilike(f"%{search}%"),
                User.first_name.ilike(f"%{search}%"),
                User.last_name.ilike(f"%{search}%")
            )
        )
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(User.created_at.desc())
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return UserListResponse(
        users=users,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent admin from changing their own role
    if user.id == current_user.id and user_update.role and user_update.role != user.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role"
        )

    # Uniqueness check for email (exclude current user)
    update_data = user_update.model_dump(exclude_unset=True)
    if "email" in update_data and update_data["email"] is not None:
        email = update_data["email"]
        email_result = await db.execute(
            select(User).where(User.email == email, User.id != user.id)
        )
        conflicting = email_result.scalar_one_or_none()
        if conflicting:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )

    # Update fields
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    return user



@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete a user (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Do not allow deleting an active user? (kept permissive for admin)
    await db.delete(user)
    await db.commit()
    return {"message": "User deleted successfully"}


@router.post("/users/{user_id}/resend-invitation")
async def resend_invitation(

    user_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Resend invitation email to a user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.status != UserStatus.INVITED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not in INVITED status"
        )
    
    # Generate new invitation token
    token = generate_invitation_token()
    token_hash = hash_token(token)
    expires_at = datetime.utcnow() + timedelta(hours=settings.invitation_expire_hours)
    
    # Create new invitation record
    invitation = Invitation(
        email=user.email,
        role=user.role.value,
        token_hash=token_hash,
        invited_by_id=current_user.id,
        expires_at=expires_at,
        status=InvitationStatus.PENDING
    )
    db.add(invitation)
    await db.commit()
    
    # Send invitation email
    email_provider = get_email_provider()
    app_url = getattr(settings, "app_url", "http://localhost:5173")
    invitation_link = f"{app_url}/accept-invitation?token={token}"
    subject, text_content, html_content = get_invitation_email_template(invitation_link, user.role.value)
    
    # In LOCAL_DISPLAY mode, send synchronously to get the link
    if settings.email_mode == "LOCAL_DISPLAY":
        await email_provider.send_email(
            to_email=user.email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        activation_link = email_provider.get_last_link()
        return {"message": "Invitation resent successfully", "activation_link": activation_link}
    else:
        background_tasks.add_task(
            email_provider.send_email,
            to_email=user.email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        return {"message": "Invitation resent successfully"}
