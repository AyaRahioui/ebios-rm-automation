from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class DocumentBase(BaseModel):
    filename: str
    storage_path: str
    mime_type: str
    size_bytes: int


class DocumentInDB(DocumentBase):
    id: uuid.UUID
    project_id: uuid.UUID
    uploaded_by_id: uuid.UUID
    uploaded_at: datetime

    class Config:
        from_attributes = True


class DocumentResponse(DocumentInDB):
    uploaded_by_email: Optional[str] = None
    uploaded_by_name: Optional[str] = None


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
    page: int
    page_size: int
