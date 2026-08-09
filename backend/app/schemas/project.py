from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.project import ProjectStatus
import uuid


class ProjectBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    domaine: Optional[str] = Field(None, max_length=255)
    statut: ProjectStatus = ProjectStatus.BROUILLON
    methode_cotation: str = Field(default="EBIOS RM standard 4 niveaux", max_length=100)


class ProjectCreate(ProjectBase):
    client_id: Optional[uuid.UUID] = None
    consultant_ids: list[uuid.UUID] = []



class ProjectUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    domaine: Optional[str] = Field(None, max_length=255)
    statut: Optional[ProjectStatus] = None
    methode_cotation: Optional[str] = Field(None, max_length=100)


class ProjectInDB(ProjectBase):
    id: uuid.UUID
    chef_de_projet_id: uuid.UUID
    client_id: uuid.UUID | None
    consultants_ids: list[uuid.UUID] | None
    # Activity statuses
    statut_A1_1: str
    statut_A1_2: str
    statut_A2_VALIDATION: str
    statut_A2_BS: str
    statut_A1_3: str
    statut_A3_G45_DG: str
    statut_A1_4: str
    statut_A4_SOCLE: str
    statut_A4_VERROUILLAGE: str
    # Locking
    verrouille: bool
    verrouille_at: datetime | None
    verrouille_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectResponse(ProjectInDB):
    pass


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int
    page: int
    page_size: int
