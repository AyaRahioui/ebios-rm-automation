"""Moteur de permissions RACI pour EBIOS-RM."""
import uuid
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.raci import RACIAssignment
from app.models.user import User


class RACIPermission:
    """Service de gestion des permissions basées sur la matrice RACI."""

    def __init__(self, db: AsyncSession, user: User, project_id: str | uuid.UUID):
        self.db = db
        self.user = user
        self.project_id = str(project_id)

    async def get_role(self, activite_code: str) -> str:
        """Rôle de l'user courant pour cette activité. '-' si pas assigné."""
        result = await self.db.execute(
            select(RACIAssignment.role_raci).where(
                RACIAssignment.project_id == self.project_id,
                RACIAssignment.activite_code == activite_code,
                RACIAssignment.user_id == self.user.id
            )
        )
        return result.scalar_one_or_none() or '-'

    async def can_read(self, activite_code: str) -> bool:
        """L'utilisateur peut lire l'activité (R, A, C, I)."""
        return await self.get_role(activite_code) in ('R', 'A', 'C', 'I')

    async def can_write(self, activite_code: str) -> bool:
        """L'utilisateur peut modifier l'activité (R uniquement)."""
        return await self.get_role(activite_code) == 'R'

    async def can_validate(self, activite_code: str) -> bool:
        """L'utilisateur peut valider l'activité (A uniquement)."""
        return await self.get_role(activite_code) == 'A'

    async def get_authority_user_ids(self, activite_code: str) -> list[uuid.UUID]:
        """Retourne les user_ids des A pour cette activité."""
        result = await self.db.execute(
            select(RACIAssignment.user_id).where(
                RACIAssignment.project_id == self.project_id,
                RACIAssignment.activite_code == activite_code,
                RACIAssignment.role_raci == 'A'
            )
        )
        return [row[0] for row in result.all()]

    async def get_informed_user_ids(self, activite_code: str) -> list[uuid.UUID]:
        """Retourne les user_ids des I pour cette activité."""
        result = await self.db.execute(
            select(RACIAssignment.user_id).where(
                RACIAssignment.project_id == self.project_id,
                RACIAssignment.activite_code == activite_code,
                RACIAssignment.role_raci == 'I'
            )
        )
        return [row[0] for row in result.all()]

    async def get_users_with_role(self, activite_code: str, role_raci: str) -> list[uuid.UUID]:
        """Retourne les user_ids avec un rôle RACI spécifique."""
        result = await self.db.execute(
            select(RACIAssignment.user_id).where(
                RACIAssignment.project_id == self.project_id,
                RACIAssignment.activite_code == activite_code,
                RACIAssignment.role_raci == role_raci
            )
        )
        return [row[0] for row in result.all()]

    # Garde-fous (à utiliser en Depends)
    async def require_read(self, activite_code: str):
        """Lève une exception si l'utilisateur ne peut pas lire."""
        if not await self.can_read(activite_code):
            raise HTTPException(403, f"Accès refusé à l'activité {activite_code}")

    async def require_write(self, activite_code: str):
        """Lève une exception si l'utilisateur ne peut pas écrire."""
        if not await self.can_write(activite_code):
            raise HTTPException(403, f"Vous n'êtes pas Réalisateur (R) de l'activité {activite_code}")

    async def require_validate(self, activite_code: str):
        """Lève une exception si l'utilisateur ne peut pas valider."""
        if not await self.can_validate(activite_code):
            raise HTTPException(403, f"Vous n'êtes pas Autorité (A) de l'activité {activite_code}")
