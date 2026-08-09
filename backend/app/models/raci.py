import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, UniqueConstraint, Index, Text, func

from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class RACIAssignment(Base):
    __tablename__ = "raci_assignments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    activite_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_raci: Mapped[str] = mapped_column(String(1), nullable=False)  # 'R' | 'A' | 'C' | 'I' | '-'
    assigned_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now())
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        UniqueConstraint('project_id', 'activite_code', 'user_id', name='uq_raci_per_user'),
        Index('ix_raci_project_activite', 'project_id', 'activite_code'),
    )


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    activite_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    object_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 'evenement_redoute' | 'controle' | 'valeur_metier' | None
    object_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    user_nom: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # SUBMITTED | VALIDATED | REJECTED | LOCKED | RACI_EDITED
    role_raci: Mapped[str] = mapped_column(String(1), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), index=True)

    __table_args__ = (
        Index('ix_audit_project_activite', 'project_id', 'activite_code'),
        Index('ix_audit_timestamp', 'timestamp'),
    )
