from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
import os
import uuid
import mimetypes
from datetime import datetime
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus
from app.models.document import Document
from app.models.project_member import ProjectMember, ProjectMemberStatus
from app.core.dependencies import get_current_user, require_project_access
from app.core.config import settings
from app.schemas.document import DocumentResponse, DocumentListResponse
from app.services.notification_service import create_notification

router = APIRouter()


# Ensure upload directory exists
os.makedirs(settings.upload_dir, exist_ok=True)


@router.post("/projects/{project_id}/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    project_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a document to a project (client only)."""
    project = await require_project_access(project_id, current_user, db)
    
    if project.statut in [ProjectStatus.TERMINE, ProjectStatus.ARCHIVE]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Project is closed")

    # Only clients can upload documents
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can upload documents"
        )
    
    # Verify client belongs to the project's organization
    if current_user.organization_id != project.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only upload documents to your organization's projects"
        )
    
    # Validate file size
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > settings.max_file_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {settings.max_file_size} bytes"
        )
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    storage_path = os.path.join(settings.upload_dir, unique_filename)
    
    # Save file
    with open(storage_path, "wb") as f:
        f.write(file_content)
    
    # Detect MIME type
    mime_type, _ = mimetypes.guess_type(file.filename)
    if not mime_type:
        mime_type = "application/octet-stream"
    
    # Create document record
    document = Document(
        project_id=project_id,
        uploaded_by_id=current_user.id,
        filename=file.filename,
        storage_path=storage_path,
        mime_type=mime_type,
        size_bytes=file_size
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    
    # Notify all accepted consultants on this project
    members_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.status == ProjectMemberStatus.ACCEPTED
        )
    )
    members = members_result.scalars().all()
    
    for member in members:
        await create_notification(
            db=db,
            user_id=member.user_id,
            notification_type="DOCUMENT_ADDED",
            message=f"Un nouveau document '{file.filename}' a ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©posÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â© sur le projet '{project.nom}'",
            related_project_id=project_id,
            background_tasks=background_tasks
        )
    
    await db.commit()

    # Populate user info for response
    document.uploaded_by_email = current_user.email
    document.uploaded_by_name = f"{current_user.first_name} {current_user.last_name}"
    
    return document


@router.get("/projects/{project_id}/documents", response_model=DocumentListResponse)
async def list_project_documents(
    project_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List documents for a project."""
    project = await require_project_access(project_id, current_user, db)
    
    # Get total count
    count_result = await db.execute(
        select(func.count()).select_from(Document).where(Document.project_id == project_id)
    )
    total = count_result.scalar()
    
    # Get documents with pagination
    result = await db.execute(
        select(Document)
        .where(Document.project_id == project_id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .order_by(Document.uploaded_at.desc())
    )
    documents = result.scalars().all()
    
    # Populate uploader info for each document
    for document in documents:
        uploader_result = await db.execute(select(User).where(User.id == document.uploaded_by_id))
        uploader = uploader_result.scalar_one_or_none()
        if uploader:
            document.uploaded_by_email = uploader.email
            document.uploaded_by_name = f"{uploader.first_name} {uploader.last_name}"
    
    return DocumentListResponse(
        documents=documents,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/documents/{document_id}/download")
async def download_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Download a document."""
    # Get document
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Verify user has access to the project
    await require_project_access(document.project_id, current_user, db)
    
    # Check if file exists
    if not os.path.exists(document.storage_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )
    
    # Return file
    return FileResponse(
        path=document.storage_path,
        filename=document.filename,
        media_type=document.mime_type
    )
