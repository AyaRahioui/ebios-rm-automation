"""Logique de pré-remplissage par défaut de la matrice RACI."""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.raci import RACIAssignment
from app.models.user import User
from app.core.activites import ActiviteCode, ALL_ACTIVITES


async def populate_default_raci(
    db: AsyncSession,
    project_id: str | uuid.UUID,
    chef_projet: User,
    client: User | None,
    consultants: list[User]
):
    """
    Pré-remplissage intelligent basé sur la composition de l'équipe :
    
    - S'il y a plusieurs consultants : le premier est R principal, les autres sont C
    - Le client est A sur les validations métier (A1.2, A1.3, A2_VALIDATION)
    - Le chef de projet est A sur le cadrage (A1.1) et le verrouillage (A4_VERROUILLAGE)
    - Pour A3_G45_DG : on prend le client (qui peut avoir job_title='DG')
    - Pour A2_BS et A1.4 : on prend un consultant identifié comme expert technique
    
    Args:
        db: Session de base de données
        project_id: ID du projet (UUID ou string)
        chef_projet: User du chef de projet
        client: User du client (peut être None)
        consultants: Liste des users consultants
    """
    if not consultants:
        raise ValueError("Au moins 1 consultant est requis")

    # Convert project_id to string if it's a UUID
    project_id_str = str(project_id)

    primary_consultant = consultants[0]  # Premier consultant = animateur principal
    other_consultants = consultants[1:]

    assignments = []

    # A1.1 — Cadrage : Chef pilote (R), Consultant méthodologue valide (A)
    assignments += [
        (ActiviteCode.A1_1, chef_projet.id, 'R'),
        (ActiviteCode.A1_1, primary_consultant.id, 'A'),
    ]
    if client:
        assignments += [(ActiviteCode.A1_1, client.id, 'C')]

    # A1.2 — Identification VM : Consultant anime (R), Client valide (A), autres consultants aident (C)
    assignments += [
        (ActiviteCode.A1_2, primary_consultant.id, 'R'),
    ]
    if client:
        assignments += [(ActiviteCode.A1_2, client.id, 'A')]
    else:
        # Fallback: chef de projet as A if no client
        assignments += [(ActiviteCode.A1_2, chef_projet.id, 'A')]
    
    for c in other_consultants:
        assignments += [(ActiviteCode.A1_2, c.id, 'C')]

    # A2_VALIDATION — Le client valide les VM (A est obligatoire, déjà client)
    if client:
        assignments += [
            (ActiviteCode.A2_VALIDATION, client.id, 'A'),
            (ActiviteCode.A2_VALIDATION, primary_consultant.id, 'C'),
        ]
    else:
        # Fallback: chef de projet as A if no client
        assignments += [
            (ActiviteCode.A2_VALIDATION, chef_projet.id, 'A'),
            (ActiviteCode.A2_VALIDATION, primary_consultant.id, 'C'),
        ]

    # A2_BS — Consultant technique anime (R), Client valide (A)
    assignments += [
        (ActiviteCode.A2_BS, primary_consultant.id, 'R'),
    ]
    if client:
        assignments += [(ActiviteCode.A2_BS, client.id, 'A')]
    else:
        # Fallback: chef de projet as A if no client
        assignments += [(ActiviteCode.A2_BS, chef_projet.id, 'A')]
    for c in other_consultants:
        assignments += [(ActiviteCode.A2_BS, c.id, 'C')]

    # A1.3 — ER : Consultant anime (R), Client valide (A)
    assignments += [
        (ActiviteCode.A1_3, primary_consultant.id, 'R'),
    ]
    if client:
        assignments += [(ActiviteCode.A1_3, client.id, 'A')]
    else:
        # Fallback: chef de projet as A if no client
        assignments += [(ActiviteCode.A1_3, chef_projet.id, 'A')]
    
    for c in other_consultants:
        assignments += [(ActiviteCode.A1_3, c.id, 'C')]

    # A3_G45_DG — Validation G4/G5 : par défaut le Client (qui peut être DG)
    # Le Chef de projet peut reconfigurer si le DG est un autre user
    if client:
        assignments += [
            (ActiviteCode.A3_G45_DG, client.id, 'A'),
            (ActiviteCode.A3_G45_DG, primary_consultant.id, 'C'),
            (ActiviteCode.A3_G45_DG, chef_projet.id, 'I'),
        ]
    else:
        # Fallback: chef de projet as A if no client
        assignments += [
            (ActiviteCode.A3_G45_DG, chef_projet.id, 'A'),
            (ActiviteCode.A3_G45_DG, primary_consultant.id, 'C'),
        ]

    # A1.4 — Socle : Consultant anime (R), Client valide (A, peut être RSSI)
    assignments += [
        (ActiviteCode.A1_4, primary_consultant.id, 'R'),
    ]
    if client:
        assignments += [(ActiviteCode.A1_4, client.id, 'A')]
    else:
        # Fallback: chef de projet as A if no client
        assignments += [(ActiviteCode.A1_4, chef_projet.id, 'A')]
    
    for c in other_consultants:
        assignments += [(ActiviteCode.A1_4, c.id, 'C')]

    # A4_SOCLE — Validation socle : Client (RSSI)
    if client:
        assignments += [
            (ActiviteCode.A4_SOCLE, client.id, 'A'),
            (ActiviteCode.A4_SOCLE, primary_consultant.id, 'C'),
        ]
    else:
        # Fallback: chef de projet as A if no client
        assignments += [
            (ActiviteCode.A4_SOCLE, chef_projet.id, 'A'),
            (ActiviteCode.A4_SOCLE, primary_consultant.id, 'C'),
        ]

    # A4_VERROUILLAGE — Chef de projet verrouille (A)
    assignments += [
        (ActiviteCode.A4_VERROUILLAGE, chef_projet.id, 'A'),
    ]

    # Informer les autres users du projet (ajouter 'I' si pas déjà assigné)
    users_to_inform = []
    if client:
        users_to_inform.append(client)
    users_to_inform.extend(consultants)
    
    for u in users_to_inform:
        for act in ALL_ACTIVITES:
            if not any(a[0] == act and a[1] == u.id for a in assignments):
                # Ajouter 'I' si l'user n'est pas déjà assigné ailleurs
                assignments += [(act, u.id, 'I')]

    # Insérer en BDD
    for activite_code, user_id, role_raci in assignments:
        raci = RACIAssignment(
            project_id=project_id_str,
            activite_code=activite_code,
            user_id=user_id,
            role_raci=role_raci,
            assigned_by=chef_projet.id,
        )
        db.add(raci)

    await db.commit()
