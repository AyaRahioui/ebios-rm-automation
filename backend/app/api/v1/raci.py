"""API endpoints pour la gestion RACI et le workflow EBIOS-RM."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Body, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, delete

from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.project import Project
from app.models.raci import RACIAssignment, AuditLog
from app.models.atelier1 import EvenementRedoute
from app.core.dependencies import get_current_user, require_project_access, get_raci_permission
from app.core.permissions import RACIPermission
from app.core.audit import log_audit
from app.core.activites import (
    ActiviteCode, ALL_ACTIVITES, ACTIVITE_LABELS,
    WorkflowStatut, can_transition
)
from app.schemas.raci import (
    RACIAssignmentCreate, RACIAssignmentResponse, RACIBulkUpdate,
    RACIPermissionResponse, AuditLogResponse, ValidateRequest,
    WorkflowStatusResponse, MyTasksResponse, ProjetTeamResponse, UserResponse
)
from app.services.notification_service import create_notification


router = APIRouter()


# ============================================
# RACI ASSIGNMENTS
# ============================================

@router.get("/raci/projects/{project_id}/matrix", response_model=list[RACIAssignmentResponse])
async def get_raci_matrix(
    project_id: str,
    project: Project = Depends(require_project_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Récupère toute la matrice RACI d'un projet."""
    result = await db.execute(
        select(RACIAssignment).where(RACIAssignment.project_id == project_id)
    )
    assignments = result.scalars().all()
    return assignments


@router.put("/raci/projects/{project_id}/matrix", response_model=list[RACIAssignmentResponse])
async def update_raci_matrix(
    project_id: str,
    bulk_update: RACIBulkUpdate,
    project: Project = Depends(require_project_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Met à jour la matrice RACI en masse.
    Uniquement accessible au CHEF_PROJET (lecture seule pour les consultants).
    """
    if current_user.role != UserRole.CHEF_PROJET:
        raise HTTPException(403, "Seul le Chef de projet peut modifier la matrice RACI")

    # Supprimer les assignments existants pour ce projet
    existing = await db.execute(
        select(RACIAssignment).where(RACIAssignment.project_id == project_id)
    )
    for assignment in existing.scalars().all():
        await db.delete(assignment)

    # Créer les nouveaux assignments
    new_assignments = []
    for entry in bulk_update.entries:
        assignment = RACIAssignment(
            project_id=project_id,
            activite_code=entry.activite_code,
            user_id=entry.user_id,
            role_raci=entry.role_raci,
            assigned_by=current_user.id,
            assigned_at=datetime.utcnow(),
        )
        db.add(assignment)
        new_assignments.append(assignment)

    await db.commit()

    # Log audit
    await log_audit(
        db, project_id, "RACI_EDIT", current_user, "RACI_EDITED",
        role_raci='A',  # Le chef est A sur le RACI
        details=f"Matrice RACI modifiée ({len(bulk_update.entries)} entrées)"
    )

    return new_assignments


@router.get("/raci/projects/{project_id}/permissions", response_model=RACIPermissionResponse)
async def get_my_permissions(
    project_id: str,
    activite: str = Query(..., description="Code de l'activité"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retourne les permissions de l'utilisateur courant pour une activité."""
    raci = RACIPermission(db, current_user, project_id)
    user_role = await raci.get_role(activite)

    return RACIPermissionResponse(
        activite_code=activite,
        user_role=user_role,
        can_read=await raci.can_read(activite),
        can_write=await raci.can_write(activite),
        can_validate=await raci.can_validate(activite)
    )


@router.get("/raci/projects/{project_id}/team", response_model=ProjetTeamResponse)
async def get_project_team(
    project_id: str,
    project: Project = Depends(require_project_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Récupère l'équipe complète d'un projet avec les utilisateurs résolus.
    Retourne le chef de projet, le client, les consultants et tous les membres.
    """
    # Récupérer le chef de projet
    chef_projet = await db.get(User, project.chef_de_projet_id)
    if not chef_projet:
        raise HTTPException(404, "Chef de projet non trouvé")

    # Récupérer le client
    client = None
    if project.client_id:
        client = await db.get(User, project.client_id)

    # Récupérer les consultants
    consultants = []
    if project.consultants_ids:
        for consultant_id in project.consultants_ids:
            consultant = await db.get(User, consultant_id)
            if consultant:
                consultants.append(consultant)

    # Construire la liste de tous les membres
    all_members = [chef_projet]
    if client:
        all_members.append(client)
    all_members.extend(consultants)

    # Convertir en UserResponse
    def to_user_response(user: User) -> UserResponse:
        return UserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            job_title=user.job_title
        )

    return ProjetTeamResponse(
        chef_projet=to_user_response(chef_projet),
        client=to_user_response(client) if client else None,
        consultants=[to_user_response(c) for c in consultants],
        all_members=[to_user_response(m) for m in all_members]
    )


@router.post("/raci/projects/{project_id}/initialize")
async def initialize_raci_matrix(
    project_id: str,
    project: Project = Depends(require_project_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Initialize or reinitialize RACI matrix for an existing project.
    Uniquement accessible au CHEF_PROJET.
    """
    if current_user.role != UserRole.CHEF_PROJET:
        raise HTTPException(403, "Seul le Chef de projet peut initialiser la matrice RACI")

    # Delete existing RACI assignments if any
    await db.execute(
        delete(RACIAssignment).where(RACIAssignment.project_id == project_id)
    )

    # Get team members
    chef_projet = await db.get(User, project.chef_de_projet_id)
    if not chef_projet:
        raise HTTPException(404, "Chef de projet non trouvé")

    client = None
    if project.client_id:
        client = await db.get(User, project.client_id)

    consultants = []
    if project.consultants_ids:
        for consultant_id in project.consultants_ids:
            consultant = await db.get(User, consultant_id)
            if consultant:
                consultants.append(consultant)

    if not consultants:
        raise HTTPException(400, "Au moins un consultant est requis pour initialiser la matrice RACI")

    # Populate default RACI
    await populate_default_raci(db, project_id, chef_projet, client, consultants)

    return {"message": "Matrice RACI initialisée avec succès"}


# ============================================
# WORKFLOW
# ============================================

@router.post("/workflow/projects/{project_id}/activites/{activite_code}/submit")
async def submit_activity(
    project_id: str,
    activite_code: str,
    current_user: User = Depends(get_current_user),
    raci: RACIPermission = Depends(get_raci_permission),
    db: AsyncSession = Depends(get_db),
):
    """
    R soumet son travail à validation par A.
    Transition: EN_COURS → A_VALIDER
    """
    await raci.require_write(activite_code)

    if activite_code not in ACTIVITE_LABELS:
        raise HTTPException(400, "Code d'activité invalide")

    # Convert string to enum if needed
    try:
        activite_enum = ActiviteCode(activite_code)
    except ValueError:
        raise HTTPException(400, "Code d'activité invalide")

    project = await db.get(Project, project_id)
    current_statut = getattr(project, f'statut_{activite_code}', 'NON_DEMARRE')

    if current_statut not in ('EN_COURS', 'NON_DEMARRE'):
        raise HTTPException(400, f"Transition impossible depuis {current_statut}")

    # Vérifier la transition
    if not can_transition(current_statut, WorkflowStatut.A_VALIDER):
        raise HTTPException(400, f"Transition non autorisée de {current_statut} vers A_VALIDER")

    setattr(project, f'statut_{activite_code}', WorkflowStatut.A_VALIDER)
    await db.commit()

    # Notifier l'Autorité (1 seul user car contrainte 1 A max)
    a_user_ids = await raci.get_authority_user_ids(activite_code)
    for a_id in a_user_ids:
        await create_notification(
            db=db,
            user_id=a_id,
            notification_type="VALIDATION_REQUISE",
            message=f"Validation requise — {ACTIVITE_LABELS[activite_enum]}",
            related_project_id=project_id,
            background_tasks=None
        )

    # Notifier les Informés
    for i_id in await raci.get_informed_user_ids(activite_code):
        await create_notification(
            db=db,
            user_id=i_id,
            notification_type="INFO_SUBMITTED",
            message=f"Soumission — {ACTIVITE_LABELS[activite_enum]}",
            related_project_id=project_id,
            background_tasks=None
        )

    # Log audit
    await log_audit(
        db, project_id, activite_code, current_user,
        'SUBMITTED', 'R',
        details="Soumis à validation"
    )

    return {"statut": WorkflowStatut.A_VALIDER, "notified": len(a_user_ids)}


@router.post("/workflow/projects/{project_id}/activites/{activite_code}/validate")
async def validate_activity(
    project_id: str,
    activite_code: str,
    body: ValidateRequest = Body(default=ValidateRequest()),
    current_user: User = Depends(get_current_user),
    raci: RACIPermission = Depends(get_raci_permission),
    db: AsyncSession = Depends(get_db),
):
    """
    A valide le travail.
    Transition: A_VALIDER → VALIDE
    """
    await raci.require_validate(activite_code)

    project = await db.get(Project, project_id)
    current_statut = getattr(project, f'statut_{activite_code}', 'NON_DEMARRE')

    if current_statut != WorkflowStatut.A_VALIDER:
        raise HTTPException(400, "L'activité n'est pas en attente de validation")

    # Cas spécial : validation DG des G4/G5
    if activite_code == ActiviteCode.A3_G45_DG:
        await validate_dg_g45(db, project_id, current_user, body.commentaire)

    setattr(project, f'statut_{activite_code}', WorkflowStatut.VALIDE)
    await db.commit()

    # Notifier le R
    r_user_ids = await raci.get_users_with_role(activite_code, 'R')
    for r_id in r_user_ids:
        await create_notification(
            db=db,
            user_id=r_id,
            notification_type="ACTIVITE_VALIDEE",
            message=f"Validé — {ACTIVITE_LABELS[activite_enum]}" +
                   (f" — {body.commentaire}" if body.commentaire else ""),
            related_project_id=project_id,
            background_tasks=None
        )

    await log_audit(
        db, project_id, activite_code, current_user,
        'VALIDATED', 'A',
        details=body.commentaire
    )

    return {"statut": WorkflowStatut.VALIDE}


@router.post("/workflow/projects/{project_id}/activites/{activite_code}/reject")
async def reject_activity(
    project_id: str,
    activite_code: str,
    motif: str = Query(..., min_length=10),
    current_user: User = Depends(get_current_user),
    raci: RACIPermission = Depends(get_raci_permission),
    db: AsyncSession = Depends(get_db),
):
    """
    A rejette avec motif obligatoire.
    Transition: A_VALIDER → EN_COURS
    """
    await raci.require_validate(activite_code)

    if len(motif) < 10:
        raise HTTPException(400, "Motif de rejet obligatoire (min 10 caractères)")

    project = await db.get(Project, project_id)
    setattr(project, f'statut_{activite_code}', WorkflowStatut.EN_COURS)
    await db.commit()

    # Notifier le R
    r_user_ids = await raci.get_users_with_role(activite_code, 'R')
    for r_id in r_user_ids:
        await create_notification(
            db=db,
            user_id=r_id,
            notification_type="ACTIVITE_REJETEE",
            message=f"Rejeté — {ACTIVITE_LABELS[activite_enum]}. Motif : {motif}",
            related_project_id=project_id,
            background_tasks=None
        )

    await log_audit(
        db, project_id, activite_code, current_user,
        'REJECTED', 'A',
        details=motif
    )

    return {"statut": WorkflowStatut.EN_COURS}


async def validate_dg_g45(db: AsyncSession, project_id: str, current_user: User, commentaire: str | None):
    """
    Le user A de l'activité A3_G45_DG valide les ER G4/G5.
    Le user A est en général le client (qui peut avoir job_title='DG').
    """
    # Récupérer tous les ER G4/G5 du projet
    g45_ers = await db.execute(
        select(EvenementRedoute).where(
            EvenementRedoute.project_id == project_id,
            or_(
                EvenementRedoute.gravite_calculee.in_(['G4', 'G5']),
                EvenementRedoute.gravite_client.in_(['G4', 'G5'])
            )
        )
    )
    g45_ers = g45_ers.scalars().all()

    if not g45_ers:
        raise HTTPException(400, "Aucun ER G4/G5 à valider. Utilisez un autre workflow.")

    # Pour chaque ER, créer une entrée audit
    for er in g45_ers:
        await log_audit(
            db, project_id, ActiviteCode.A3_G45_DG, current_user,
            'VALIDATED', 'A',
            object_type='evenement_redoute',
            object_id=er.id,
            details=f"{commentaire or ''} — ER: {er.nom} (gravité {er.gravite_client or er.gravite_calculee})"
        )


# ============================================
# VERROUILLAGE
# ============================================

@router.post("/workflow/projects/{project_id}/verrouiller")
async def lock_atelier1(
    project_id: str,
    current_user: User = Depends(get_current_user),
    raci: RACIPermission = Depends(get_raci_permission),
    db: AsyncSession = Depends(get_db),
):
    """
    Verrouille l'Atelier 1 (irréversible).
    Bloqué si une activité n'est pas validée OU si un ER G4/G5 n'a pas été validé.
    """
    await raci.require_validate(ActiviteCode.A4_VERROUILLAGE)

    project = await db.get(Project, project_id)

    # 1. Vérifier que toutes les activités sont validées
    for activite_code in ALL_ACTIVITES:
        statut = getattr(project, f'statut_{activite_code}', 'NON_DEMARRE')
        if statut not in (WorkflowStatut.VALIDE, WorkflowStatut.TERMINE):
            raise HTTPException(400,
                f"Verrouillage impossible : l'activité {activite_code} "
                f"({ACTIVITE_LABELS[str(activite_enum)]}) n'est pas validée (statut : {statut})"
            )

    # 2. Cas critique : tous les ER G4/G5 doivent avoir été validés
    g45_ers = await db.execute(
        select(EvenementRedoute).where(
            EvenementRedoute.project_id == project_id,
            or_(
                EvenementRedoute.gravite_calculee.in_(['G4', 'G5']),
                EvenementRedoute.gravite_client.in_(['G4', 'G5'])
            )
        )
    )
    g45_ers = g45_ers.scalars().all()

    if g45_ers:
        dg_user_ids = await raci.get_authority_user_ids(ActiviteCode.A3_G45_DG)
        if not dg_user_ids:
            raise HTTPException(400,
                "Aucun Autorité assigné à l'activité A3_G45_DG. "
                "Configurez le RACI : le user en A doit valider chaque ER G4/G5."
            )

        for er in g45_ers:
            validated = await db.execute(
                select(AuditLog).where(
                    AuditLog.project_id == project_id,
                    AuditLog.activite_code == ActiviteCode.A3_G45_DG,
                    AuditLog.object_id == er.id,
                    AuditLog.action == 'VALIDATED',
                    AuditLog.user_id.in_(dg_user_ids)
                )
            )
            if not validated.scalar_one_or_none():
                raise HTTPException(400,
                    f"Verrouillage bloqué : l'ER G4/G5 '{er.nom}' "
                    f"(gravité {er.gravite_client or er.gravite_calculee}) n'a pas été validé "
                    f"par l'Autorité de l'activité A3_G45_DG."
                )

    # 3. Verrouiller
    project.verrouille = True
    project.verrouille_at = datetime.utcnow()
    project.verrouille_by = current_user.id
    project.statut_A4_VERROUILLAGE = WorkflowStatut.TERMINE

    # 4. Notifier toute l'équipe
    team_result = await db.execute(
        select(RACIAssignment.user_id).where(
            RACIAssignment.project_id == project_id
        ).distinct()
    )
    team_user_ids = [row[0] for row in team_result.all()]

    for u_id in team_user_ids:
        await create_notification(
            db=db,
            user_id=u_id,
            notification_type="PROJET_VERROUILLE",
            message=f"Atelier 1 verrouillé par {current_user.first_name} {current_user.last_name}",
            related_project_id=project_id,
            background_tasks=None
        )

    # 5. Log audit
    await log_audit(
        db, project_id, ActiviteCode.A4_VERROUILLAGE, current_user,
        'LOCKED', 'A',
        details=f"Atelier 1 verrouillé ({len(g45_ers)} ER G4/G5 validés)"
    )

    await db.commit()

    return {"statut": "VERROUILLE", "verrouille_at": project.verrouille_at}


# ============================================
# AUDIT
# ============================================

@router.get("/audit/projects/{project_id}/log", response_model=list[AuditLogResponse])
async def get_audit_log(
    project_id: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Récupère le journal d'audit d'un projet."""
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.project_id == project_id)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
    )
    entries = result.scalars().all()
    return entries


@router.get("/audit/evenement/{er_id}/log", response_model=list[AuditLogResponse])
async def get_evenement_audit(
    er_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Récupère l'audit d'un ER spécifique."""
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.object_id == er_id)
        .order_by(AuditLog.timestamp.desc())
    )
    entries = result.scalars().all()
    return entries


# ============================================
# DASHBOARD
# ============================================

@router.get("/me/tasks", response_model=MyTasksResponse)
async def get_my_tasks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retourne les activités où l'utilisateur courant est R (à faire) ou A (à valider).
    """
    # Récupérer les projets de l'utilisateur
    from app.models.project_member import ProjectMember, ProjectMemberStatus

    projects_result = await db.execute(
        select(Project).join(ProjectMember).where(
            ProjectMember.user_id == current_user.id,
            ProjectMember.status == ProjectMemberStatus.ACCEPTED
        )
    )
    projects = projects_result.scalars().all()

    a_faire = []
    a_valider = []

    for project in projects:
        raci = RACIPermission(db, current_user, project.id)
        for act in ALL_ACTIVITES:
            role = await raci.get_role(act)
            statut = getattr(project, f'statut_{act}', 'NON_DEMARRE')

            if role == 'R' and statut in ('NON_DEMARRE', 'EN_COURS'):
                a_faire.append({
                    "project_id": str(project.id),
                    "project_nom": project.nom,
                    "activite": act,
                    "label": ACTIVITE_LABELS[str(act)]
                })
            elif role == 'A' and statut == WorkflowStatut.A_VALIDER:
                a_valider.append({
                    "project_id": str(project.id),
                    "project_nom": project.nom,
                    "activite": act,
                    "label": ACTIVITE_LABELS[str(act)]
                })

    return MyTasksResponse(a_faire=a_faire, a_valider=a_valider)
