"""Helper pour l'audit log des actions RACI."""
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.raci import AuditLog
from app.models.user import User


async def log_audit(
    db: AsyncSession,
    project_id: str | uuid.UUID,
    activite_code: str,
    user: User,
    action: str,
    role_raci: str,
    object_type: str | None = None,
    object_id: uuid.UUID | None = None,
    details: str | None = None
):
    """
    Crée une entrée d'audit pour une action RACI.
    
    Args:
        db: Session de base de données
        project_id: ID du projet
        activite_code: Code de l'activité (ex: "A1.1")
        user: Utilisateur effectuant l'action
        action: Type d'action (SUBMITTED | VALIDATED | REJECTED | LOCKED | RACI_EDITED)
        role_raci: Rôle RACI de l'utilisateur pour cette activité
        object_type: Type d'objet concerné (optionnel)
        object_id: ID de l'objet concerné (optionnel)
        details: Détails supplémentaires (optionnel)
    """
    entry = AuditLog(
        project_id=str(project_id),
        activite_code=activite_code,
        object_type=object_type,
        object_id=object_id,
        user_id=user.id,
        user_nom=f"{user.first_name} {user.last_name}",
        action=action,
        role_raci=role_raci,
        details=details,
        timestamp=datetime.utcnow(),
    )
    db.add(entry)
    await db.commit()
