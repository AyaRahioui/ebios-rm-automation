import uuid
from datetime import datetime
from sqlalchemy import String, Text, Enum as SQLEnum, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base
import enum


class NotificationType(str, enum.Enum):
    INVITATION = "INVITATION"
    MISSION_ASSIGNED = "MISSION_ASSIGNED"
    DOCUMENT_ADDED = "DOCUMENT_ADDED"
    MISSION_ACCEPTED = "MISSION_ACCEPTED"
    MISSION_DECLINED = "MISSION_DECLINED"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[NotificationType] = mapped_column(SQLEnum(NotificationType), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    related_project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id"), nullable=True, index=True)
    is_read: Mapped[bool] = mapped_column(default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index('ix_notification_user_read', 'user_id', 'is_read'),
    )
