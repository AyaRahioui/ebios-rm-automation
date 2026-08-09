import uuid
from datetime import datetime
from sqlalchemy import String, Enum as SQLEnum, Index, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    CHEF_PROJET = "CHEF_PROJET"
    CONSULTANT = "CONSULTANT"
    CLIENT = "CLIENT"


class UserStatus(str, enum.Enum):
    INVITED = "INVITED"
    ACTIVE = "ACTIVE"
    DISABLED = "DISABLED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), nullable=False, default=UserRole.CONSULTANT)
    status: Mapped[UserStatus] = mapped_column(SQLEnum(UserStatus), nullable=False, default=UserStatus.INVITED)
    
    # ✨ NOUVEAU : intitulé de poste informatif (texte libre)
    job_title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Exemples : 'DG', 'RSSI', 'DSI', 'Directeur industriel', 'DPO', 'CTO', etc.
    # ⚠ N'est PAS utilisé pour les permissions — juste affiché dans l'UI
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), nullable=False)

    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), onupdate=datetime.utcnow, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (
        Index('ix_user_role_status', 'role', 'status'),
    )
