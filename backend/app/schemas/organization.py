from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class OrganizationBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=255)
    secteur_activite: Optional[str] = Field(None, max_length=255)


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=255)
    secteur_activite: Optional[str] = Field(None, max_length=255)


class OrganizationInDB(OrganizationBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class OrganizationResponse(OrganizationInDB):
    pass


class OrganizationDetailResponse(OrganizationResponse):
    users: list[dict] = []  # Simplified user info
