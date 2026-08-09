import uuid
from datetime import datetime
from sqlalchemy import Enum as SQLEnum, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
import enum


class ProjectRole(str, enum.Enum):
    CHEF_PROJET = "CHEF_PROJET"
    CONSULTANT = "CONSULTANT"
    CLIENT = "CLIENT"


class ProjectMemberStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"



class ProjectMember(Base):
    __tablename__ = "project_members"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_role: Mapped[ProjectRole] = mapped_column(SQLEnum(ProjectRole), nullable=False, default=ProjectRole.CONSULTANT)
    status: Mapped[ProjectMemberStatus] = mapped_column(SQLEnum(ProjectMemberStatus), nullable=False, default=ProjectMemberStatus.PENDING)

    invited_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), nullable=False)
    responded_at: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (
        UniqueConstraint('project_id', 'user_id', name='uq_project_user'),
    )

