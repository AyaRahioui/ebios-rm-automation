from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from app.models.notification import NotificationType
import uuid


class NotificationBase(BaseModel):
    type: NotificationType
    message: str
    payload: Optional[dict] = None
    related_project_id: Optional[uuid.UUID] = None


class NotificationInDB(NotificationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationResponse(NotificationInDB):
    pass


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    total: int
    unread_count: int
    page: int
    page_size: int
