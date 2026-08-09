"""
Script de seed pour générer des données de démonstration pour EBIOS-RM.

Usage:
    python scripts/seed_db.py
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Ajouter le répertoire parent au path pour importer les modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus
from app.models.project_member import ProjectMember, ProjectRole, ProjectMemberStatus

# Configuration de la base de données (SQLite pour le seed)
DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def create_user(session: AsyncSession, email: str, first_name: str, last_name: str, role: UserRole) -> User:
    """Crée un utilisateur avec un mot de passe par défaut."""
    import hashlib
    # Hash simple pour démo (en production, utiliser bcrypt)
    hashed_password = hashlib.sha256("demo123".encode()).hexdigest()
    
    user = User(
        email=email,
        first_name=first_name,
        last_name=last_name,
        role=role,
        hashed_password=hashed_password,
    )
    session.add(user)
    await session.flush()
    return user


async def seed_users(session: AsyncSession):
    """Crée les utilisateurs de démonstration."""
    print("Création des utilisateurs...")
    
    users = [
        # Admin
        ("admin@ebios-rm.com", "Admin", "Système", UserRole.ADMIN),
        
        # Chefs de projet
        ("chef1@ebios-rm.com", "Marie", "Dupont", UserRole.CHEF_PROJET),
        ("chef2@ebios-rm.com", "Pierre", "Martin", UserRole.CHEF_PROJET),
        
        # Consultants
        ("consultant1@ebios-rm.com", "Jean", "Durand", UserRole.CONSULTANT),
        ("consultant2@ebios-rm.com", "Sophie", "Bernard", UserRole.CONSULTANT),
        ("consultant3@ebios-rm.com", "Lucas", "Petit", UserRole.CONSULTANT),
        
        # Clients
        ("client1@ebios-rm.com", "François", "Moreau", UserRole.CLIENT),
        ("client2@ebios-rm.com", "Isabelle", "Leroy", UserRole.CLIENT),
    ]
    
    created_users = {}
    for email, first_name, last_name, role in users:
        user = await create_user(session, email, first_name, last_name, role)
        created_users[email] = user
        print(f"  ✓ {email} ({role.value})")
    
    return created_users


async def create_project(
    session: AsyncSession,
    chef_de_projet: User,
    client: User,
    consultants: list[User],
    nom: str,
    description: str,
    domaine: str,
    statut: ProjectStatus,
) -> Project:
    """Crée un projet avec ses membres."""
    project = Project(
        nom=nom,
        description=description,
        domaine=domaine,
        statut=statut,
        methode_cotation="EBIOS RM standard 4 niveaux",
        chef_de_projet_id=chef_de_projet.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(project)
    await session.flush()
    
    # Ajouter le chef de projet comme membre
    chef_member = ProjectMember(
        project_id=project.id,
        user_id=chef_de_projet.id,
        project_role=ProjectRole.CHEF_PROJET,
        status=ProjectMemberStatus.ACCEPTED,
        invited_at=datetime.utcnow(),
        responded_at=datetime.utcnow(),
    )
    session.add(chef_member)
    
    # Ajouter le client comme membre
    client_member = ProjectMember(
        project_id=project.id,
        user_id=client.id,
        project_role=ProjectRole.CLIENT,
        status=ProjectMemberStatus.ACCEPTED,
        invited_at=datetime.utcnow(),
        responded_at=datetime.utcnow(),
    )
    session.add(client_member)
    
    # Ajouter les consultants
    for consultant in consultants:
        member = ProjectMember(
            project_id=project.id,
            user_id=consultant.id,
            project_role=ProjectRole.CONSULTANT,
            status=ProjectMemberStatus.ACCEPTED,
            invited_at=datetime.utcnow(),
            responded_at=datetime.utcnow(),
        )
        session.add(member)
    
    await session.flush()
    return project


async def seed_projects(session: AsyncSession, users: dict[str, User]):
    """Crée les projets de démonstration."""
    print("\nCréation des projets...")
    
    projects = [
        {
            "chef": users["chef1@ebios-rm.com"],
            "client": users["client1@ebios-rm.com"],
            "consultants": [users["consultant1@ebios-rm.com"], users["consultant2@ebios-rm.com"]],
            "nom": "Audit Sécurité SI - Banque XYZ",
            "description": "Audit complet de la sécurité du système d'information de la banque XYZ",
            "domaine": "Finance",
            "statut": ProjectStatut.EN_COURS,
        },
        {
            "chef": users["chef1@ebios-rm.com"],
            "client": users["client2@ebios-rm.com"],
            "consultants": [users["consultant3@ebios-rm.com"]],
            "nom": "Évaluation Risques Cloud - TechCorp",
            "description": "Évaluation des risques liés à la migration vers le cloud",
            "domaine": "Technologie",
            "statut": ProjectStatut.EN_COURS,
        },
        {
            "chef": users["chef2@ebios-rm.com"],
            "client": users["client1@ebios-rm.com"],
            "consultants": [users["consultant1@ebios-rm.com"], users["consultant2@ebios-rm.com"]],
            "nom": "Conformité RGPD - SantéPlus",
            "description": "Analyse de conformité au RGPD pour le système de gestion de données patients",
            "domaine": "Santé",
            "statut": ProjectStatut.BROUILLON,
        },
        {
            "chef": users["chef2@ebios-rm.com"],
            "client": users["client2@ebios-rm.com"],
            "consultants": [users["consultant3@ebios-rm.com"]],
            "nom": "Sécurité IoT - Industrie 4.0",
            "description": "Évaluation des risques liés aux équipements IoT connectés",
            "domaine": "Industrie",
            "statut": ProjectStatut.TERMINE,
        },
    ]
    
    created_projects = []
    for proj_data in projects:
        project = await create_project(
            session,
            proj_data["chef"],
            proj_data["client"],
            proj_data["consultants"],
            proj_data["nom"],
            proj_data["description"],
            proj_data["domaine"],
            proj_data["statut"],
        )
        created_projects.append(project)
        print(f"  ✓ {project.nom} ({project.statut.value})")
    
    return created_projects


async def main():
    """Fonction principale de seed."""
    print("=== Seed EBIOS-RM ===\n")
    
    async with AsyncSessionLocal() as session:
        try:
            # Créer les utilisateurs
            users = await seed_users(session)
            
            # Créer les projets
            projects = await seed_projects(session, users)
            
            # Commit des changements
            await session.commit()
            
            print("\n=== Seed terminé avec succès ===")
            print(f"\nUtilisateurs créés: {len(users)}")
            print(f"Projets créés: {len(projects)}")
            print("\nMot de passe par défaut pour tous les utilisateurs: demo123")
            print("\nComptes de démonstration:")
            print("  Admin: admin@ebios-rm.com")
            print("  Chef de projet 1: chef1@ebios-rm.com")
            print("  Chef de projet 2: chef2@ebios-rm.com")
            print("  Consultant 1: consultant1@ebios-rm.com")
            print("  Consultant 2: consultant2@ebios-rm.com")
            print("  Consultant 3: consultant3@ebios-rm.com")
            print("  Client 1: client1@ebios-rm.com")
            print("  Client 2: client2@ebios-rm.com")
            
        except Exception as e:
            await session.rollback()
            print(f"\nErreur lors du seed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
