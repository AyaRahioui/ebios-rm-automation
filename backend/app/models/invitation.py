import uuid
from datetime import datetime
from sqlalchemy import String, Enum as SQLEnum, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
import enum


class InvitationStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    EXPIRED = "EXPIRED"


class Invitation(Base):
    __tablename__ = "invitations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id"), nullable=True, index=True)
    invited_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(nullable=False, index=True)
    status: Mapped[InvitationStatus] = mapped_column(SQLEnum(InvitationStatus), nullable=False, default=InvitationStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), nullable=False)

    __table_args__ = (
        Index('ix_invitation_email_status', 'email', 'status'),
    )
