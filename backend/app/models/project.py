import uuid
from datetime import datetime
from sqlalchemy import String, Text, Enum as SQLEnum, ForeignKey, Boolean, JSON, func

from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
import enum


class ProjectStatus(str, enum.Enum):
    BROUILLON = "BROUILLON"
    EN_COURS = "EN_COURS"
    EN_PAUSE = "EN_PAUSE"
    TERMINE = "TERMINE"
    ARCHIVE = "ARCHIVE"


class Project(Base):

    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    domaine: Mapped[str | None] = mapped_column(String(255), nullable=True)
    statut: Mapped[ProjectStatus] = mapped_column(SQLEnum(ProjectStatus), nullable=False, default=ProjectStatus.BROUILLON)
    methode_cotation: Mapped[str] = mapped_column(String(100), nullable=False, default="EBIOS RM standard 4 niveaux")
    chef_de_projet_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    # Équipe (1 chef + N consultants + 1 client)
    client_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    consultants_ids: Mapped[list[uuid.UUID] | None] = mapped_column(JSON, nullable=True, default=list)

    # Workflow statuts (9 sous-activités)
    statut_A1_1: Mapped[str] = mapped_column(String(20), default='NON_DEMARRE')
    statut_A1_2: Mapped[str] = mapped_column(String(20), default='NON_DEMARRE')
    statut_A2_VALIDATION: Mapped[str] = mapped_column(String(20), default='NON_DEMARRE')
    statut_A2_BS: Mapped[str] = mapped_column(String(20), default='NON_DEMARRE')
    statut_A1_3: Mapped[str] = mapped_column(String(20), default='NON_DEMARRE')
    statut_A3_G45_DG: Mapped[str] = mapped_column(String(20), default='NON_DEMARRE')
    statut_A1_4: Mapped[str] = mapped_column(String(20), default='NON_DEMARRE')
    statut_A4_SOCLE: Mapped[str] = mapped_column(String(20), default='NON_DEMARRE')
    statut_A4_VERROUILLAGE: Mapped[str] = mapped_column(String(20), default='NON_DEMARRE')

    # Verrouillage
    verrouille: Mapped[bool] = mapped_column(Boolean, default=False)
    verrouille_at: Mapped[datetime | None] = mapped_column(nullable=True)
    verrouille_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), onupdate=datetime.utcnow, nullable=False)
