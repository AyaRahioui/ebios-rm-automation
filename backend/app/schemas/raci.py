"""Schémas Pydantic pour le RACI et le workflow."""
import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, field_validator
from collections import defaultdict


RoleRACI = Literal['R', 'A', 'C', 'I', '-']


class RACIAssignmentCreate(BaseModel):
    """Schéma pour créer un assignment RACI."""
    activite_code: str
    user_id: uuid.UUID
    role_raci: RoleRACI


class RACIAssignmentResponse(BaseModel):
    """Schéma de réponse pour un assignment RACI."""
    id: uuid.UUID
    project_id: uuid.UUID
    activite_code: str
    user_id: uuid.UUID
    role_raci: str
    assigned_at: datetime
    assigned_by: uuid.UUID | None

    class Config:
        from_attributes = True


class RACIBulkUpdate(BaseModel):
    """Schéma pour la mise à jour en masse de la matrice RACI."""
    entries: list[RACIAssignmentCreate] = Field(..., min_length=1)

    @field_validator('entries')
    @classmethod
    def validate_single_a_per_activity(cls, v):
        """Valide qu'il y a au moins 1 A par activité (requis pour validation)."""
        by_activity = defaultdict(list)
        for e in v:
            if e.role_raci == 'A':
                by_activity[e.activite_code].append(e)

        for act_code, entries in by_activity.items():
            if len(entries) == 0:
                raise ValueError(
                    f"Activité {act_code}: Aucun Approbateur (A) détecté — "
                    f"1 Approbateur requis par activité"
                )
        return v


class RACIPermissionResponse(BaseModel):
    """Schéma de réponse pour les permissions d'un utilisateur."""
    activite_code: str
    user_role: RoleRACI  # '-' si pas dans la matrice
    can_read: bool
    can_write: bool
    can_validate: bool


class AuditLogResponse(BaseModel):
    """Schéma de réponse pour une entrée d'audit."""
    id: uuid.UUID
    project_id: uuid.UUID
    activite_code: str
    object_type: str | None
    object_id: uuid.UUID | None
    user_id: uuid.UUID
    user_nom: str
    action: str
    role_raci: str
    details: str | None
    timestamp: datetime

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """Schéma simplifié pour un utilisateur."""
    id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    role: str
    job_title: str | None

    class Config:
        from_attributes = True


class ProjetTeamResponse(BaseModel):
    """Équipe constituée par le Chef de projet."""
    chef_projet: UserResponse
    consultants: list[UserResponse]
    client: UserResponse | None
    # Tous les users (pour affichage dans la matrice RACI)
    all_members: list[UserResponse]


class ValidateRequest(BaseModel):
    """Schéma pour la validation d'une activité."""
    commentaire: str | None = None


class WorkflowStatusResponse(BaseModel):
    """Schéma de réponse pour le statut d'une activité."""
    activite_code: str
    statut: str


class MyTasksResponse(BaseModel):
    """Schéma de réponse pour les tâches de l'utilisateur courant."""
    a_faire: list[dict]
    a_valider: list[dict]
