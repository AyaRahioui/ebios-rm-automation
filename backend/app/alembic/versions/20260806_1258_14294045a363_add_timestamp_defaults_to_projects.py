"""add_timestamp_defaults_to_projects

Revision ID: 14294045a363
Revises: 20260806_add_raci_governance
Create Date: 2026-08-06 12:58:33.089677

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '14294045a363'
down_revision = '20260806_add_raci_governance'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add server_default to projects timestamp columns
    op.alter_column('projects', 'created_at', server_default=sa.func.now())
    op.alter_column('projects', 'updated_at', server_default=sa.func.now())
    
    # Add server_default to users timestamp columns
    op.alter_column('users', 'created_at', server_default=sa.func.now())
    op.alter_column('users', 'updated_at', server_default=sa.func.now())
    
    # Add server_default to project_members timestamp columns
    op.alter_column('project_members', 'invited_at', server_default=sa.func.now())
    
    # Add server_default to notifications timestamp columns
    op.alter_column('notifications', 'created_at', server_default=sa.func.now())
    
    # Add server_default to invitations timestamp columns
    op.alter_column('invitations', 'created_at', server_default=sa.func.now())
    
    # Add server_default to documents timestamp columns
    op.alter_column('documents', 'uploaded_at', server_default=sa.func.now())
    
    # Add server_default to atelier1 tables timestamp columns (only tables that have these columns)
    op.alter_column('cadrage_atelier1', 'created_at', server_default=sa.func.now())
    op.alter_column('cadrage_atelier1', 'updated_at', server_default=sa.func.now())
    op.alter_column('valeurs_metier', 'created_at', server_default=sa.func.now())
    op.alter_column('valeurs_metier', 'updated_at', server_default=sa.func.now())
    op.alter_column('biens_supports', 'created_at', server_default=sa.func.now())
    op.alter_column('biens_supports', 'updated_at', server_default=sa.func.now())
    op.alter_column('criteres_impact', 'created_at', server_default=sa.func.now())
    op.alter_column('criteres_impact', 'updated_at', server_default=sa.func.now())
    op.alter_column('evenements_redoutes', 'created_at', server_default=sa.func.now())
    op.alter_column('evenements_redoutes', 'updated_at', server_default=sa.func.now())
    op.alter_column('referentiels_securite', 'created_at', server_default=sa.func.now())
    op.alter_column('referentiels_securite', 'updated_at', server_default=sa.func.now())
    op.alter_column('controles_conformite', 'created_at', server_default=sa.func.now())
    op.alter_column('controles_conformite', 'updated_at', server_default=sa.func.now())
    op.alter_column('actions_correctives', 'created_at', server_default=sa.func.now())
    op.alter_column('actions_correctives', 'updated_at', server_default=sa.func.now())
    op.alter_column('ecarts', 'created_at', server_default=sa.func.now())
    op.alter_column('ecarts', 'updated_at', server_default=sa.func.now())


def downgrade() -> None:
    # Remove server_default from all timestamp columns
    op.alter_column('ecarts', 'updated_at', server_default=None)
    op.alter_column('ecarts', 'created_at', server_default=None)
    op.alter_column('actions_correctives', 'updated_at', server_default=None)
    op.alter_column('actions_correctives', 'created_at', server_default=None)
    op.alter_column('controles_conformite', 'updated_at', server_default=None)
    op.alter_column('controles_conformite', 'created_at', server_default=None)
    op.alter_column('referentiels_securite', 'updated_at', server_default=None)
    op.alter_column('referentiels_securite', 'created_at', server_default=None)
    op.alter_column('evenements_redoutes', 'updated_at', server_default=None)
    op.alter_column('evenements_redoutes', 'created_at', server_default=None)
    op.alter_column('criteres_impact', 'updated_at', server_default=None)
    op.alter_column('criteres_impact', 'created_at', server_default=None)
    op.alter_column('biens_supports', 'updated_at', server_default=None)
    op.alter_column('biens_supports', 'created_at', server_default=None)
    op.alter_column('valeurs_metier', 'updated_at', server_default=None)
    op.alter_column('valeurs_metier', 'created_at', server_default=None)
    op.alter_column('cadrage_atelier1', 'updated_at', server_default=None)
    op.alter_column('cadrage_atelier1', 'created_at', server_default=None)
    op.alter_column('documents', 'uploaded_at', server_default=None)
    op.alter_column('invitations', 'created_at', server_default=None)
    op.alter_column('notifications', 'created_at', server_default=None)
    op.alter_column('project_members', 'invited_at', server_default=None)
    op.alter_column('users', 'updated_at', server_default=None)
    op.alter_column('users', 'created_at', server_default=None)
    op.alter_column('projects', 'updated_at', server_default=None)
    op.alter_column('projects', 'created_at', server_default=None)
