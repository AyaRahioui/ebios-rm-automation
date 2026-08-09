from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus
from app.models.project_member import ProjectMember, ProjectMemberStatus
from app.models.atelier1 import (
    CadrageAtelier1,
    ValeurMetier,
    BienSupport,
    CritereImpact,
    EvenementRedoute,
    EvenementRedouteImpact,
    ReferentielSecurite,
    ControleConformite,
    ActionCorrective,
    Ecart,
    Gravite,
    ActiviteStatut,
    ImpactCategorie,
    DomaineMaturite,
)
from app.core.dependencies import get_current_user, require_project_access, get_raci_permission
from app.core.permissions import RACIPermission
from app.schemas.atelier1 import (
    CadrageAtelier1Create,
    CadrageAtelier1Update,
    CadrageAtelier1Response,
    ActiviteStatutUpdate,
    ValeurMetierCreate,
    ValeurMetierUpdate,
    ValeurMetierResponse,
    ValeurMetierListResponse,
    BienSupportCreate,
    BienSupportUpdate,
    BienSupportResponse,
    BienSupportListResponse,
    CritereImpactResponse,
    CritereImpactListResponse,
    EvenementRedouteCreate,
    EvenementRedouteUpdate,
    EvenementRedouteResponse,
    EvenementRedouteListResponse,
    EvenementRedouteImpactCreate,
    EvenementRedouteValidationUpdate,
    CartographieGraviteResponse,
    ReferentielSecuriteCreate,
    ReferentielSecuriteUpdate,
    ReferentielSecuriteResponse,
    ReferentielSecuriteListResponse,
    ControleConformiteCreate,
    ControleConformiteUpdate,
    ControleConformiteResponse,
    ControleConformiteListResponse,
    MaturiteSynthetiqueResponse,
    ActionCorrectiveCreate,
    ActionCorrectiveUpdate,
    ActionCorrectiveResponse,
    ActionCorrectiveListResponse,
    EcartCreate,
    EcartUpdate,
    EcartResponse,
    EcartListResponse,
    MaturiteParDomaineResponse,
    MaturiteParDomaineListResponse,
    PlanTraitementResponse,
)

router = APIRouter()


def check_project_not_locked(project: Project):
    """Check if project is not locked (Atelier 1 can be modified)."""
    if project.verrouille:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Atelier 1 is locked and cannot be modified"
        )


async def require_atelier1_access(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Project:
    """Dependency to verify user has access to Atelier 1 (consultants accepted, chef de projet owner, admin)."""
    project = await require_project_access(project_id, current_user, db)
    
    # Clients cannot access Atelier 1
    if current_user.role == UserRole.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients cannot access Atelier 1"
        )
    
    # Consultants must have ACCEPTED status (only applies to consultants)
    if current_user.role == UserRole.CONSULTANT:
        result = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == current_user.id,
                ProjectMember.status == ProjectMemberStatus.ACCEPTED
            )
        )
        member = result.scalar_one_or_none()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must accept the mission to access Atelier 1"
            )

    # Project must not be in BROUILLON status only when the requester is a CONSULTANT.
    # Chef de projet must always access Atelier 1 immediately after project creation.
    if project.statut == ProjectStatus.BROUILLON and current_user.role == UserRole.CONSULTANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Atelier 1 is not accessible until at least one consultant accepts the mission"
        )

    
    return project


# Activité 1 - Cadrage endpoints
@router.get("/projects/{project_id}/atelier1/cadrage", response_model=CadrageAtelier1Response)
async def get_cadrage(
    project_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """Get cadrage data for a project."""
    result = await db.execute(
        select(CadrageAtelier1).where(CadrageAtelier1.project_id == project_id)
    )
    cadrage = result.scalar_one_or_none()
    
    if not cadrage:
        # Return default empty cadrage
        return CadrageAtelier1Response(
            id=None,
            project_id=project_id,
            definition_activite=None,
            activites_metier_concernees=None,
            ressources_necessaires=None,
            criteres=None,
            temporalite=None,
            prochaine_revue=None,
            raci=None,
            rencontres_planifiees=None,
            outil_gestion_risques=None,
            cartographie_si_document_id=None,
            activite1_statut=ActiviteStatut.NON_DEMARRE,
            activite2_statut=ActiviteStatut.NON_DEMARRE,
            activite3_statut=ActiviteStatut.NON_DEMARRE,
            activite4_statut=ActiviteStatut.NON_DEMARRE,
            created_at=None,
            updated_at=None
        )
    
    return cadrage


@router.put("/projects/{project_id}/atelier1/cadrage", response_model=CadrageAtelier1Response)
async def upsert_cadrage(
    project_id: str,
    cadrage_data: CadrageAtelier1Update,
    project: Project = Depends(require_atelier1_access),
    current_user: User = Depends(get_current_user),
    raci: RACIPermission = Depends(get_raci_permission),
    db: AsyncSession = Depends(get_db)
):
    """Create or update cadrage data for a project."""
    check_project_not_locked(project)
    
    # Check RACI permissions for A1.1
    await raci.require_write("A1.1")
    
    result = await db.execute(
        select(CadrageAtelier1).where(CadrageAtelier1.project_id == project_id)
    )
    cadrage = result.scalar_one_or_none()
    
    if cadrage:
        # Update existing
        update_data = cadrage_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(cadrage, field, value)
    else:
        # Create new
        cadrage = CadrageAtelier1(
            project_id=project_id,
            activite1_statut=ActiviteStatut.NON_DEMARRE,
            activite2_statut=ActiviteStatut.NON_DEMARRE,
            activite3_statut=ActiviteStatut.NON_DEMARRE,
            activite4_statut=ActiviteStatut.NON_DEMARRE,
            **cadrage_data.model_dump(exclude_unset=True)
        )
        db.add(cadrage)
    
    await db.commit()
    await db.refresh(cadrage)
    
    return cadrage


@router.patch("/projects/{project_id}/atelier1/activite1-statut")
async def update_activite1_statut(
    project_id: str,
    statut_update: ActiviteStatutUpdate,
    project: Project = Depends(require_atelier1_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update activity 1 status."""
    result = await db.execute(
        select(CadrageAtelier1).where(CadrageAtelier1.project_id == project_id)
    )
    cadrage = result.scalar_one_or_none()
    
    if not cadrage:
        cadrage = CadrageAtelier1(
            project_id=project_id,
            activite1_statut=statut_update.statut,
            activite2_statut=ActiviteStatut.NON_DEMARRE,
            activite3_statut=ActiviteStatut.NON_DEMARRE,
            activite4_statut=ActiviteStatut.NON_DEMARRE
        )
        db.add(cadrage)
    else:
        cadrage.activite1_statut = statut_update.statut
    
    await db.commit()
    
    return {"message": "Activity 1 status updated"}


# Activité 2 - Valeurs Métier & Biens Supports endpoints
@router.get("/projects/{project_id}/atelier1/valeurs-metier", response_model=ValeurMetierListResponse)
async def list_valeurs_metier(
    project_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """List valeurs métier for a project."""
    result = await db.execute(
        select(ValeurMetier).where(ValeurMetier.project_id == project_id)
    )
    valeurs = result.scalars().all()
    
    return ValeurMetierListResponse(
        valeurs_metier=valeurs,
        total=len(valeurs)
    )


@router.post("/projects/{project_id}/atelier1/valeurs-metier", response_model=ValeurMetierResponse, status_code=status.HTTP_201_CREATED)
async def create_valeur_metier(
    project_id: str,
    valeur_data: ValeurMetierCreate,
    project: Project = Depends(require_atelier1_access),
    current_user: User = Depends(get_current_user),
    raci: RACIPermission = Depends(get_raci_permission),
    db: AsyncSession = Depends(get_db)
):
    """Create a valeur métier."""
    check_project_not_locked(project)
    
    # Check RACI permissions for A1.2
    await raci.require_write("A1.2")
    
    # Override project_id from URL
    valeur_data.project_id = project_id
    
    valeur = ValeurMetier(**valeur_data.model_dump())
    db.add(valeur)
    await db.commit()
    await db.refresh(valeur)
    
    # Update activity 2 status to EN_COURS if not already
    result = await db.execute(
        select(CadrageAtelier1).where(CadrageAtelier1.project_id == project_id)
    )
    cadrage = result.scalar_one_or_none()
    if cadrage and cadrage.activite2_statut == ActiviteStatut.NON_DEMARRE:
        cadrage.activite2_statut = ActiviteStatut.EN_COURS
        await db.commit()
    
    return valeur


@router.get("/valeurs-metier/{valeur_id}", response_model=ValeurMetierResponse)
async def get_valeur_metier(
    valeur_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a valeur métier by ID."""
    result = await db.execute(select(ValeurMetier).where(ValeurMetier.id == valeur_id))
    valeur = result.scalar_one_or_none()
    
    if not valeur:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Valeur métier not found"
        )
    
    # Check access
    await require_atelier1_access(str(valeur.project_id), current_user, db)
    
    return valeur


@router.patch("/valeurs-metier/{valeur_id}", response_model=ValeurMetierResponse)
async def update_valeur_metier(
    valeur_id: str,
    valeur_update: ValeurMetierUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a valeur métier."""
    result = await db.execute(select(ValeurMetier).where(ValeurMetier.id == valeur_id))
    valeur = result.scalar_one_or_none()
    
    if not valeur:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Valeur métier not found"
        )
    
    # Check access
    await require_atelier1_access(str(valeur.project_id), current_user, db)
    
    update_data = valeur_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(valeur, field, value)
    
    await db.commit()
    await db.refresh(valeur)
    
    return valeur


@router.delete("/valeurs-metier/{valeur_id}")
async def delete_valeur_metier(
    valeur_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a valeur métier."""
    result = await db.execute(select(ValeurMetier).where(ValeurMetier.id == valeur_id))
    valeur = result.scalar_one_or_none()
    
    if not valeur:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Valeur métier not found"
        )
    
    # Check access
    await require_atelier1_access(str(valeur.project_id), current_user, db)
    
    await db.delete(valeur)
    await db.commit()
    
    return {"message": "Valeur métier deleted successfully"}


@router.get("/valeurs-metier/{valeur_id}/biens-supports", response_model=BienSupportListResponse)
async def list_biens_supports(
    valeur_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List biens supports for a valeur métier."""
    result = await db.execute(select(ValeurMetier).where(ValeurMetier.id == valeur_id))
    valeur = result.scalar_one_or_none()
    
    if not valeur:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Valeur métier not found"
        )
    
    # Check access
    await require_atelier1_access(str(valeur.project_id), current_user, db)
    
    result = await db.execute(
        select(BienSupport).where(BienSupport.valeur_metier_id == valeur_id)
    )
    biens = result.scalars().all()
    
    return BienSupportListResponse(
        biens_supports=biens,
        total=len(biens)
    )


@router.post("/valeurs-metier/{valeur_id}/biens-supports", response_model=BienSupportResponse, status_code=status.HTTP_201_CREATED)
async def create_bien_support(
    valeur_id: str,
    bien_data: BienSupportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a bien support for a valeur métier."""
    result = await db.execute(select(ValeurMetier).where(ValeurMetier.id == valeur_id))
    valeur = result.scalar_one_or_none()
    
    if not valeur:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Valeur métier not found"
        )
    
    # Check access
    await require_atelier1_access(str(valeur.project_id), current_user, db)
    
    # Set valeur_metier_id from URL parameter if not provided in request body
    create_data = bien_data.model_dump()
    if not create_data.get('valeur_metier_id'):
        create_data['valeur_metier_id'] = valeur_id
    
    bien = BienSupport(**create_data)
    db.add(bien)
    await db.commit()
    await db.refresh(bien)
    
    return bien


@router.patch("/biens-supports/{bien_id}", response_model=BienSupportResponse)
async def update_bien_support(
    bien_id: str,
    bien_update: BienSupportUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a bien support."""
    result = await db.execute(
        select(BienSupport).join(ValeurMetier).where(BienSupport.id == bien_id)
    )
    bien = result.scalar_one_or_none()
    
    if not bien:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bien support not found"
        )
    
    # Check access
    await require_atelier1_access(str(bien.valeur_metier.project_id), current_user, db)
    
    update_data = bien_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(bien, field, value)
    
    await db.commit()
    await db.refresh(bien)
    
    return bien


@router.delete("/biens-supports/{bien_id}")
async def delete_bien_support(
    bien_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a bien support."""
    result = await db.execute(
        select(BienSupport).join(ValeurMetier).where(BienSupport.id == bien_id)
    )
    bien = result.scalar_one_or_none()
    
    if not bien:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bien support not found"
        )
    
    # Check access
    await require_atelier1_access(str(bien.valeur_metier.project_id), current_user, db)
    
    await db.delete(bien)
    await db.commit()
    
    return {"message": "Bien support deleted successfully"}


@router.patch("/projects/{project_id}/atelier1/activite2-statut")
async def update_activite2_statut(
    project_id: str,
    statut_update: ActiviteStatutUpdate,
    project: Project = Depends(require_atelier1_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update activity 2 status."""
    result = await db.execute(
        select(CadrageAtelier1).where(CadrageAtelier1.project_id == project_id)
    )
    cadrage = result.scalar_one_or_none()
    
    if not cadrage:
        cadrage = CadrageAtelier1(
            project_id=project_id,
            activite1_statut=ActiviteStatut.NON_DEMARRE,
            activite2_statut=statut_update.statut,
            activite3_statut=ActiviteStatut.NON_DEMARRE,
            activite4_statut=ActiviteStatut.NON_DEMARRE
        )
        db.add(cadrage)
    else:
        cadrage.activite2_statut = statut_update.statut
    
    await db.commit()
    
    return {"message": "Activity 2 status updated"}


# Activité 3 - Événements Redoutés endpoints
@router.get("/projects/{project_id}/atelier1/criteres-impact", response_model=CritereImpactListResponse)
async def list_criteres_impact(
    project_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """List all critères d'impact (global, not project-specific)."""
    result = await db.execute(select(CritereImpact))
    criteres = result.scalars().all()
    
    return CritereImpactListResponse(
        criteres=criteres,
        total=len(criteres)
    )


def calculate_gravite_from_cotations(cotations: list[int]) -> Gravite:
    """Calculate gravité from cotations using the mapping rule."""
    if not cotations:
        return Gravite.G1
    
    max_cotation = max(cotations)
    
    # Mapping: 1→G1/G2, 2→G2/G3, 3→G3/G4, 4→G4/G5
    # Using the higher gravité in each range for safety
    if max_cotation == 1:
        return Gravite.G2
    elif max_cotation == 2:
        return Gravite.G3
    elif max_cotation == 3:
        return Gravite.G4
    elif max_cotation == 4:
        return Gravite.G5
    else:
        return Gravite.G1


def calculate_gravite_from_impacts(intensities: list[int]) -> Gravite:
    """Calculate gravité from impact intensities using the mapping rule."""
    if not intensities:
        return Gravite.G1

    max_intensity = max(intensities)

    # Mapping: 0→G1, 1→G2, 2→G3, 3→G4, 4→G5
    if max_intensity == 0:
        return Gravite.G1
    elif max_intensity == 1:
        return Gravite.G2
    elif max_intensity == 2:
        return Gravite.G3
    elif max_intensity == 3:
        return Gravite.G4
    elif max_intensity == 4:
        return Gravite.G5
    else:
        return Gravite.G1


@router.get("/projects/{project_id}/atelier1/evenements-redoutes", response_model=EvenementRedouteListResponse)
async def list_evenements_redoutes(
    project_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """List événements redoutés for a project."""
    # Get all valeur_metier IDs for this project
    valeur_result = await db.execute(
        select(ValeurMetier.id).where(ValeurMetier.project_id == project_id)
    )
    valeur_ids = valeur_result.scalars().all()
    
    if not valeur_ids:
        return EvenementRedouteListResponse(evenements=[], total=0)
    
    result = await db.execute(
        select(EvenementRedoute).where(EvenementRedoute.valeur_metier_id.in_(valeur_ids))
    )
    evenements = result.scalars().all()
    
    return EvenementRedouteListResponse(
        evenements=evenements,
        total=len(evenements)
    )


@router.post("/projects/{project_id}/atelier1/evenements-redoutes", response_model=EvenementRedouteResponse, status_code=status.HTTP_201_CREATED)
async def create_evenement_redoute(
    project_id: str,
    evenement_data: EvenementRedouteCreate,
    project: Project = Depends(require_atelier1_access),
    current_user: User = Depends(get_current_user),
    raci: RACIPermission = Depends(get_raci_permission),
    db: AsyncSession = Depends(get_db)
):
    """Create an événement redouté."""
    check_project_not_locked(project)
    
    # Check RACI permissions for A1.3
    await raci.require_write("A1.3")
    
    # Verify valeur_metier belongs to this project
    valeur_result = await db.execute(
        select(ValeurMetier).where(
            ValeurMetier.id == evenement_data.valeur_metier_id,
            ValeurMetier.project_id == project_id
        )
    )
    valeur = valeur_result.scalar_one_or_none()
    
    if not valeur:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valeur métier not found or does not belong to this project"
        )
    
    # Calculate gravité from impacts if provided
    calculated_gravite = Gravite.G1
    if evenement_data.impacts:
        intensities = [impact.intensite for impact in evenement_data.impacts]
        calculated_gravite = calculate_gravite_from_impacts(intensities)
    
    # Use provided gravité if surchargée, otherwise use calculated
    final_gravite = evenement_data.gravite if evenement_data.gravite_surchargee else calculated_gravite
    
    # If surchargée, require justification
    if evenement_data.gravite_surchargee and not evenement_data.justification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Justification is required when gravité is surchargée"
        )
    
    evenement = EvenementRedoute(
        valeur_metier_id=evenement_data.valeur_metier_id,
        nom=evenement_data.nom,
        description=evenement_data.description,
        gravite=final_gravite,
        gravite_surchargee=evenement_data.gravite_surchargee,
        justification=evenement_data.justification,
        criteres_dic=evenement_data.criteres_dic,
        validated_by_metier=evenement_data.validated_by_metier,
        validated_by_dg=evenement_data.validated_by_dg,
        commentaire_client=evenement_data.commentaire_client,
        statut=evenement_data.statut
    )
    db.add(evenement)
    await db.flush()  # Get the evenement ID
    
    # Add impacts if provided
    if evenement_data.impacts:
        for impact_data in evenement_data.impacts:
            impact = EvenementRedouteImpact(
                evenement_redoute_id=evenement.id,
                categorie=impact_data.categorie,
                intensite=impact_data.intensite
            )
            db.add(impact)
    
    await db.commit()
    await db.refresh(evenement)
    
    # Update activity 3 status to EN_COURS if not already
    result = await db.execute(
        select(CadrageAtelier1).where(CadrageAtelier1.project_id == project_id)
    )
    cadrage = result.scalar_one_or_none()
    if cadrage and cadrage.activite3_statut == ActiviteStatut.NON_DEMARRE:
        cadrage.activite3_statut = ActiviteStatut.EN_COURS
        await db.commit()
    
    return evenement


@router.patch("/evenements-redoutes/{evenement_id}", response_model=EvenementRedouteResponse)
async def update_evenement_redoute(
    evenement_id: str,
    evenement_update: EvenementRedouteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an événement redouté."""
    result = await db.execute(
        select(EvenementRedoute).join(ValeurMetier).where(EvenementRedoute.id == evenement_id)
    )
    evenement = result.scalar_one_or_none()
    
    if not evenement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement redouté not found"
        )
    
    # Check access
    await require_atelier1_access(str(evenement.valeur_metier.project_id), current_user, db)
    
    # Recalculate gravité if impacts are being updated
    if evenement_update.impacts:
        intensities = [impact.intensite for impact in evenement_update.impacts]
        calculated_gravite = calculate_gravite_from_impacts(intensities)
        final_gravite = evenement_update.gravite if evenement_update.gravite_surchargee else calculated_gravite
        
        # If surchargée, require justification
        if evenement_update.gravite_surchargee and not evenement_update.justification:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Justification is required when gravité is surchargée"
            )
        
        evenement_update.gravite = final_gravite
    
    # Update fields
    update_data = evenement_update.model_dump(exclude_unset=True, exclude={'impacts'})
    for field, value in update_data.items():
        setattr(evenement, field, value)
    
    # Update impacts if provided
    if evenement_update.impacts:
        # Delete existing impacts
        existing_impacts = await db.execute(
            select(EvenementRedouteImpact).where(EvenementRedouteImpact.evenement_redoute_id == evenement_id)
        )
        for old_impact in existing_impacts.scalars().all():
            await db.delete(old_impact)
        
        # Add new impacts
        for impact_data in evenement_update.impacts:
            impact = EvenementRedouteImpact(
                evenement_redoute_id=evenement.id,
                categorie=impact_data.categorie,
                intensite=impact_data.intensite
            )
            db.add(impact)
    
    await db.commit()
    await db.refresh(evenement)
    
    return evenement


@router.delete("/evenements-redoutes/{evenement_id}")
async def delete_evenement_redoute(
    evenement_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an événement redouté."""
    result = await db.execute(
        select(EvenementRedoute).join(ValeurMetier).where(EvenementRedoute.id == evenement_id)
    )
    evenement = result.scalar_one_or_none()
    
    if not evenement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement redouté not found"
        )
    
    # Check access
    await require_atelier1_access(str(evenement.valeur_metier.project_id), current_user, db)
    
    await db.delete(evenement)
    await db.commit()
    
    return {"message": "Événement redouté deleted successfully"}


@router.patch("/evenements-redoutes/{evenement_id}/validation", response_model=EvenementRedouteResponse)
async def validate_evenement_redoute(
    evenement_id: str,
    validation_data: EvenementRedouteValidationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Validate an événement redouté (2-phase validation: Métier + DG)."""
    result = await db.execute(
        select(EvenementRedoute).join(ValeurMetier).where(EvenementRedoute.id == evenement_id)
    )
    evenement = result.scalar_one_or_none()
    
    if not evenement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Événement redouté not found"
        )
    
    # Check access
    await require_atelier1_access(str(evenement.valeur_metier.project_id), current_user, db)
    
    # Update validation fields
    evenement.validated_by_metier = validation_data.validated_by_metier
    evenement.validated_by_dg = validation_data.validated_by_dg
    evenement.commentaire_client = validation_data.commentaire_client
    
    # Update statut based on validation
    if evenement.validated_by_dg:
        evenement.statut = "VALIDE_FINAL"
    elif evenement.validated_by_metier:
        evenement.statut = "VALIDE_METIER"
    else:
        evenement.statut = "BROUILLON"
    
    await db.commit()
    await db.refresh(evenement)
    
    return evenement


@router.get("/projects/{project_id}/atelier1/cartographie-gravite", response_model=CartographieGraviteResponse)
async def get_cartographie_gravite(
    project_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """Get cartographie de gravité for a project."""
    # Get all valeur_metier IDs for this project
    valeur_result = await db.execute(
        select(ValeurMetier.id).where(ValeurMetier.project_id == project_id)
    )
    valeur_ids = valeur_result.scalars().all()
    
    if not valeur_ids:
        return CartographieGraviteResponse(
            evenements_par_gravite={},
            valeurs_metier_par_gravite={}
        )
    
    # Get all evenements for this project
    evenement_result = await db.execute(
        select(EvenementRedoute).where(EvenementRedoute.valeur_metier_id.in_(valeur_ids))
    )
    evenements = evenement_result.scalars().all()
    
    # Group evenements by gravité
    evenements_par_gravite = {
        "G5": [],
        "G4": [],
        "G3": [],
        "G2": [],
        "G1": []
    }
    
    for evenement in evenements:
        gravite_str = evenement.gravite.value
        if gravite_str in evenements_par_gravite:
            evenements_par_gravite[gravite_str].append(evenement)
    
    # Get all valeurs métier with their max gravité
    valeur_result = await db.execute(
        select(ValeurMetier).where(ValeurMetier.project_id == project_id)
    )
    valeurs = valeur_result.scalars().all()
    
    valeurs_metier_par_gravite = {
        "G5": [],
        "G4": [],
        "G3": [],
        "G2": [],
        "G1": []
    }
    
    for valeur in valeurs:
        # Get max gravité of evenements for this valeur
        evenement_result = await db.execute(
            select(EvenementRedoute).where(EvenementRedoute.valeur_metier_id == valeur.id)
        )
        valeur_evenements = evenement_result.scalars().all()
        
        if valeur_evenements:
            max_gravite = max([e.gravite for e in valeur_evenements], key=lambda g: g.value)
            gravite_str = max_gravite.value
            if gravite_str in valeurs_metier_par_gravite:
                valeurs_metier_par_gravite[gravite_str].append(valeur)
        else:
            valeurs_metier_par_gravite["G1"].append(valeur)
    
    return CartographieGraviteResponse(
        evenements_par_gravite=evenements_par_gravite,
        valeurs_metier_par_gravite=valeurs_metier_par_gravite
    )


@router.get("/projets/{project_id}/atelier1/echelle-gravite")
async def get_echelle_gravite(
    project_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """Get the gravity scale for a project (standard EBIOS RM G1-G5)."""
    # Return the standard EBIOS RM gravity scale
    echelle_standard = {
        "id": "standard",
        "projetId": project_id,
        "source": "STANDARD_EBIOS",
        "niveaux": [
            {
                "niveau": 1,
                "code": "G1",
                "libelle": "Mineure",
                "description": "Impact négligeable, facilement récupérable",
                "couleur": "#10B981"
            },
            {
                "niveau": 2,
                "code": "G2",
                "libelle": "Significative",
                "description": "Impact modéré, récupérable avec des efforts",
                "couleur": "#FACC15"
            },
            {
                "niveau": 3,
                "code": "G3",
                "libelle": "Grave",
                "description": "Impact important, nécessite une intervention significative",
                "couleur": "#F97316"
            },
            {
                "niveau": 4,
                "code": "G4",
                "libelle": "Critique",
                "description": "Impact critique, menace la continuité de l'activité",
                "couleur": "#DC2626"
            },
            {
                "niveau": 5,
                "code": "G5",
                "libelle": "Catastrophique",
                "description": "Impact catastrophique, menace la survie de l'organisation",
                "couleur": "#7F1D1D"
            }
        ]
    }
    return echelle_standard


@router.patch("/projects/{project_id}/atelier1/activite3-statut")
async def update_activite3_statut(
    project_id: str,
    statut_update: ActiviteStatutUpdate,
    project: Project = Depends(require_atelier1_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update activity 3 status."""
    result = await db.execute(
        select(CadrageAtelier1).where(CadrageAtelier1.project_id == project_id)
    )
    cadrage = result.scalar_one_or_none()
    
    if not cadrage:
        cadrage = CadrageAtelier1(
            project_id=project_id,
            activite1_statut=ActiviteStatut.NON_DEMARRE,
            activite2_statut=ActiviteStatut.NON_DEMARRE,
            activite3_statut=statut_update.statut,
            activite4_statut=ActiviteStatut.NON_DEMARRE
        )
        db.add(cadrage)
    else:
        cadrage.activite3_statut = statut_update.statut
    
    await db.commit()
    
    return {"message": "Activity 3 status updated"}


# Activité 4 - Référentiels, Contrôles, Actions Correctives endpoints
@router.get("/projects/{project_id}/atelier1/referentiels", response_model=ReferentielSecuriteListResponse)
async def list_referentiels(
    project_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """List référentiels de sécurité for a project."""
    result = await db.execute(
        select(ReferentielSecurite).where(ReferentielSecurite.project_id == project_id)
    )
    referentiels = result.scalars().all()
    
    return ReferentielSecuriteListResponse(
        referentiels=referentiels,
        total=len(referentiels)
    )


@router.post("/projects/{project_id}/atelier1/referentiels", response_model=ReferentielSecuriteResponse, status_code=status.HTTP_201_CREATED)
async def create_referentiel(
    project_id: str,
    referentiel_data: ReferentielSecuriteCreate,
    project: Project = Depends(require_atelier1_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a référentiel de sécurité."""
    referentiel_data.project_id = project_id
    
    referentiel = ReferentielSecurite(**referentiel_data.model_dump())
    db.add(referentiel)
    await db.commit()
    await db.refresh(referentiel)
    
    # Update activity 4 status to EN_COURS if not already
    result = await db.execute(
        select(CadrageAtelier1).where(CadrageAtelier1.project_id == project_id)
    )
    cadrage = result.scalar_one_or_none()
    if cadrage and cadrage.activite4_statut == ActiviteStatut.NON_DEMARRE:
        cadrage.activite4_statut = ActiviteStatut.EN_COURS
        await db.commit()
    
    return referentiel


@router.patch("/referentiels/{referentiel_id}", response_model=ReferentielSecuriteResponse)
async def update_referentiel(
    referentiel_id: str,
    referentiel_update: ReferentielSecuriteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a référentiel de sécurité."""
    result = await db.execute(select(ReferentielSecurite).where(ReferentielSecurite.id == referentiel_id))
    referentiel = result.scalar_one_or_none()
    
    if not referentiel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Référentiel not found"
        )
    
    # Check access
    await require_atelier1_access(str(referentiel.project_id), current_user, db)
    
    update_data = referentiel_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(referentiel, field, value)
    
    await db.commit()
    await db.refresh(referentiel)
    
    return referentiel


@router.delete("/projects/{project_id}/atelier1/referentiels/{referentiel_id}")
async def delete_referentiel(
    project_id: str,
    referentiel_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete a référentiel de sécurité."""
    result = await db.execute(select(ReferentielSecurite).where(ReferentielSecurite.id == referentiel_id))
    referentiel = result.scalar_one_or_none()
    
    if not referentiel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Référentiel not found"
        )
    
    await db.delete(referentiel)
    await db.commit()
    
    return {"message": "Référentiel deleted successfully"}


@router.get("/projects/{project_id}/atelier1/controles-conformite", response_model=ControleConformiteListResponse)
async def list_controles_conformite(
    project_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """List contrôles de conformité for a project."""
    try:
        # Get all referentiel IDs for this project
        referentiel_result = await db.execute(
            select(ReferentielSecurite).where(ReferentielSecurite.project_id == project.id)
        )
        referentiel_ids = [r.id for r in referentiel_result.scalars().all()]
        
        if not referentiel_ids:
            return ControleConformiteListResponse(controles=[], total=0)
        
        result = await db.execute(
            select(ControleConformite).where(ControleConformite.referentiel_id.in_(referentiel_ids))
        )
        controles = result.scalars().all()
        
        return ControleConformiteListResponse(
            controles=controles,
            total=len(controles)
        )
    except Exception as e:
        # Log the error for debugging
        import traceback
        print(f"Error in list_controles_conformite: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error loading controles: {str(e)}"
        )


@router.post("/projects/{project_id}/atelier1/controles-conformite", response_model=ControleConformiteResponse, status_code=status.HTTP_201_CREATED)
async def create_controle_conformite(
    project_id: str,
    controle_data: ControleConformiteCreate,
    project: Project = Depends(require_atelier1_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a contrôle de conformité."""
    # Verify referentiel belongs to this project
    referentiel_result = await db.execute(
        select(ReferentielSecurite).where(
            ReferentielSecurite.id == controle_data.referentiel_id,
            ReferentielSecurite.project_id == project_id
        )
    )
    referentiel = referentiel_result.scalar_one_or_none()
    
    if not referentiel:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Référentiel not found or does not belong to this project"
        )
    
    controle = ControleConformite(**controle_data.model_dump())
    db.add(controle)
    await db.commit()
    await db.refresh(controle)
    
    return controle


@router.patch("/controles-conformite/{controle_id}", response_model=ControleConformiteResponse)
async def update_controle_conformite(
    controle_id: str,
    controle_update: ControleConformiteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a contrôle de conformité."""
    result = await db.execute(
        select(ControleConformite).join(ReferentielSecurite).where(ControleConformite.id == controle_id)
    )
    controle = result.scalar_one_or_none()
    
    if not controle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contrôle not found"
        )
    
    # Check access
    await require_atelier1_access(str(controle.referentiel.project_id), current_user, db)
    
    update_data = controle_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(controle, field, value)
    
    await db.commit()
    await db.refresh(controle)
    
    return controle


@router.delete("/projects/{project_id}/atelier1/controles-conformite/{controle_id}")
async def delete_controle_conformite(
    project_id: str,
    controle_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete a contrôle de conformité."""
    result = await db.execute(
        select(ControleConformite).where(ControleConformite.id == controle_id)
    )
    controle = result.scalar_one_or_none()
    
    if not controle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contrôle not found"
        )
    
    await db.delete(controle)
    await db.commit()
    
    return {"message": "Contrôle deleted successfully"}


@router.get("/projects/{project_id}/atelier1/maturite-synthetique", response_model=MaturiteSynthetiqueResponse)
async def get_maturite_synthetique(
    project_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """Get synthetic maturity level for a project."""
    # Get all referentiel IDs for this project
    referentiel_result = await db.execute(
        select(ReferentielSecurite).where(ReferentielSecurite.project_id == project.id)
    )
    referentiel_ids = [r.id for r in referentiel_result.scalars().all()]
    
    if not referentiel_ids:
        return MaturiteSynthetiqueResponse(
            niveau_maturite_moyen=None,
            nombre_controles_evalues=0,
            nombre_controles_total=0
        )
    
    result = await db.execute(
        select(ControleConformite).where(ControleConformite.referentiel_id.in_(referentiel_ids))
    )
    controles = result.scalars().all()
    
    nombre_controles_total = len(controles)
    controles_avec_maturite = [c for c in controles if c.niveau_maturite is not None]
    nombre_controles_evalues = len(controles_avec_maturite)
    
    if nombre_controles_evalues == 0:
        niveau_maturite_moyen = None
    else:
        niveau_maturite_moyen = sum(c.niveau_maturite for c in controles_avec_maturite) / nombre_controles_evalues
    
    return MaturiteSynthetiqueResponse(
        niveau_maturite_moyen=niveau_maturite_moyen,
        nombre_controles_evalues=nombre_controles_evalues,
        nombre_controles_total=nombre_controles_total
    )


@router.get("/projects/{project_id}/atelier1/actions-correctives", response_model=ActionCorrectiveListResponse)
async def list_actions_correctives(
    project_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """List actions correctives for a project."""
    # Get all controle IDs for this project
    referentiel_result = await db.execute(
        select(ReferentielSecurite).where(ReferentielSecurite.project_id == project.id)
    )
    referentiel_ids = [r.id for r in referentiel_result.scalars().all()]
    
    if not referentiel_ids:
        return ActionCorrectiveListResponse(actions=[], total=0)
    
    controle_result = await db.execute(
        select(ControleConformite).where(ControleConformite.referentiel_id.in_(referentiel_ids))
    )
    controle_ids = [c.id for c in controle_result.scalars().all()]
    
    # Get actions linked to these controles OR standalone actions (no controle)
    result = await db.execute(
        select(ActionCorrective).where(
            (ActionCorrective.controle_conformite_id.in_(controle_ids)) |
            (ActionCorrective.controle_conformite_id == None)
        )
    )
    actions = result.scalars().all()
    
    return ActionCorrectiveListResponse(
        actions=actions,
        total=len(actions)
    )


@router.post("/projects/{project_id}/atelier1/actions-correctives", response_model=ActionCorrectiveResponse, status_code=status.HTTP_201_CREATED)
async def create_action_corrective(
    project_id: str,
    action_data: ActionCorrectiveCreate,
    project: Project = Depends(require_atelier1_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create an action corrective."""
    # If linked to a controle, verify it belongs to this project
    if action_data.controle_conformite_id:
        controle_result = await db.execute(
            select(ControleConformite).join(ReferentielSecurite).where(
                ControleConformite.id == action_data.controle_conformite_id,
                ReferentielSecurite.project_id == project_id
            )
        )
        controle = controle_result.scalar_one_or_none()
        
        if not controle:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contrôle not found or does not belong to this project"
            )
    
    action = ActionCorrective(**action_data.model_dump())
    db.add(action)
    await db.commit()
    await db.refresh(action)
    
    return action


@router.patch("/actions-correctives/{action_id}", response_model=ActionCorrectiveResponse)
async def update_action_corrective(
    action_id: str,
    action_update: ActionCorrectiveUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an action corrective."""
    result = await db.execute(
        select(ActionCorrective).where(ActionCorrective.id == action_id)
    )
    action = result.scalar_one_or_none()
    
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action corrective not found"
        )
    
    # Check access - need to find the project through controle or standalone
    if action.controle_conformite_id:
        controle_result = await db.execute(
            select(ControleConformite).join(ReferentielSecurite).where(ControleConformite.id == action.controle_conformite_id)
        )
        controle = controle_result.scalar_one_or_none()
        if controle:
            await require_atelier1_access(str(controle.referentiel.project_id), current_user, db)
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated contrôle not found")
    else:
        # Standalone action - need to determine project context
        # For now, we'll require admin or chef de projet for standalone actions
        if current_user.role not in [UserRole.ADMIN, UserRole.CHEF_PROJET]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin or chef de projet can modify standalone actions"
            )
    
    update_data = action_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(action, field, value)
    
    await db.commit()
    await db.refresh(action)
    
    return action


@router.delete("/projects/{project_id}/atelier1/actions-correctives/{action_id}")
async def delete_action_corrective(
    project_id: str,
    action_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete an action corrective."""
    result = await db.execute(
        select(ActionCorrective).where(ActionCorrective.id == action_id)
    )
    action = result.scalar_one_or_none()
    
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action corrective not found"
        )
    
    await db.delete(action)
    await db.commit()
    
    return {"message": "Action corrective deleted successfully"}


# Écarts endpoints
@router.get("/projects/{project_id}/atelier1/ecarts", response_model=EcartListResponse)
async def list_ecarts(
    project_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """List écarts for a project."""
    result = await db.execute(
        select(Ecart).where(Ecart.project_id == project_id).order_by(Ecart.numero)
    )
    ecarts = result.scalars().all()
    
    return EcartListResponse(
        ecarts=ecarts,
        total=len(ecarts)
    )


@router.post("/projects/{project_id}/atelier1/ecarts", response_model=EcartResponse, status_code=status.HTTP_201_CREATED)
async def create_ecart(
    project_id: str,
    ecart_data: EcartCreate,
    project: Project = Depends(require_atelier1_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create an écart."""
    ecart_data.project_id = project_id
    
    # Auto-generate numero if not provided
    if ecart_data.numero == 0:
        result = await db.execute(
            select(Ecart).where(Ecart.project_id == project_id)
        )
        existing_ecarts = result.scalars().all()
        max_numero = max([e.numero for e in existing_ecarts], default=0)
        ecart_data.numero = max_numero + 1
    
    # If linked to a controle, verify it belongs to this project
    if ecart_data.controle_id:
        controle_result = await db.execute(
            select(ControleConformite).join(ReferentielSecurite).where(
                ControleConformite.id == ecart_data.controle_id,
                ReferentielSecurite.project_id == project_id
            )
        )
        controle = controle_result.scalar_one_or_none()
        
        if not controle:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contrôle not found or does not belong to this project"
            )
    
    ecart = Ecart(**ecart_data.model_dump())
    db.add(ecart)
    await db.commit()
    await db.refresh(ecart)
    
    # Update activity 4 status to EN_COURS if not already
    result = await db.execute(
        select(CadrageAtelier1).where(CadrageAtelier1.project_id == project_id)
    )
    cadrage = result.scalar_one_or_none()
    if cadrage and cadrage.activite4_statut == ActiviteStatut.NON_DEMARRE:
        cadrage.activite4_statut = ActiviteStatut.EN_COURS
        await db.commit()
    
    return ecart


@router.patch("/ecarts/{ecart_id}", response_model=EcartResponse)
async def update_ecart(
    ecart_id: str,
    ecart_update: EcartUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an écart."""
    result = await db.execute(select(Ecart).where(Ecart.id == ecart_id))
    ecart = result.scalar_one_or_none()
    
    if not ecart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Écart not found"
        )
    
    # Check access
    await require_atelier1_access(str(ecart.project_id), current_user, db)
    
    update_data = ecart_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ecart, field, value)
    
    await db.commit()
    await db.refresh(ecart)
    
    return ecart


@router.delete("/projects/{project_id}/atelier1/ecarts/{ecart_id}")
async def delete_ecart(
    project_id: str,
    ecart_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """Delete an écart."""
    result = await db.execute(select(Ecart).where(Ecart.id == ecart_id))
    ecart = result.scalar_one_or_none()
    
    if not ecart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Écart not found"
        )
    
    await db.delete(ecart)
    await db.commit()
    
    return {"message": "Écart deleted successfully"}


# Maturité par domaine endpoint
@router.get("/projects/{project_id}/atelier1/maturite-par-domaine", response_model=MaturiteParDomaineListResponse)
async def get_maturite_par_domaine(
    project_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """Get maturity level by domain for a project."""
    # Get all referentiel IDs for this project
    referentiel_result = await db.execute(
        select(ReferentielSecurite).where(ReferentielSecurite.project_id == project.id)
    )
    referentiel_ids = [r.id for r in referentiel_result.scalars().all()]
    
    domaines_data = []
    
    for domaine in DomaineMaturite:
        if not referentiel_ids:
            domaines_data.append({
                "domaine": domaine,
                "niveau_moyen": None,
                "pourcentage": 0.0,
                "nb_controles_evalues": 0,
                "nb_controles_total": 0
            })
            continue
        
        # Get total controles for this domain
        total_result = await db.execute(
            select(ControleConformite).where(
                ControleConformite.referentiel_id.in_(referentiel_ids),
                ControleConformite.domaine == domaine
            )
        )
        controles_total = total_result.scalars().all()
        nb_controles_total = len(controles_total)
        
        # Get evaluated controles for this domain
        evaluated_result = await db.execute(
            select(ControleConformite).where(
                ControleConformite.referentiel_id.in_(referentiel_ids),
                ControleConformite.domaine == domaine,
                ControleConformite.niveau_maturite.isnot(None)
            )
        )
        controles_evaluated = evaluated_result.scalars().all()
        nb_controles_evalues = len(controles_evaluated)
        
        if nb_controles_evalues == 0:
            niveau_moyen = None
            pourcentage = 0.0
        else:
            niveau_moyen = sum(c.niveau_maturite for c in controles_evaluated) / nb_controles_evalues
            pourcentage = (niveau_moyen / 5) * 100
        
        domaines_data.append({
            "domaine": domaine,
            "niveau_moyen": niveau_moyen,
            "pourcentage": pourcentage,
            "nb_controles_evalues": nb_controles_evalues,
            "nb_controles_total": nb_controles_total
        })
    
    return MaturiteParDomaineListResponse(domaines=domaines_data)


# Plan de traitement endpoint
@router.get("/projects/{project_id}/atelier1/plan-traitement", response_model=PlanTraitementResponse)
async def get_plan_traitement(
    project_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """Get consolidated treatment plan for a project."""
    from datetime import datetime, timedelta
    
    # Get all écarts for this project
    ecart_result = await db.execute(
        select(Ecart).where(Ecart.project_id == project.id)
    )
    ecarts = ecart_result.scalars().all()
    
    # Get all actions correctives linked to écarts
    ecart_ids = [e.id for e in ecarts]
    action_result = await db.execute(
        select(ActionCorrective).where(ActionCorrective.ecart_id.in_(ecart_ids))
    )
    actions = action_result.scalars().all()
    
    # Calculate stats
    from datetime import datetime, timedelta
    date_30j = datetime.utcnow() + timedelta(days=30)
    
    critiques_a_30j = sum(1 for a in actions if a.priorite == Priorite.CRITIQUE and a.date_prevue and a.date_prevue <= date_30j and a.statut != StatutAction.FAIT)
    haute_priorite = sum(1 for a in actions if a.priorite == Priorite.HAUTE and a.statut != StatutAction.FAIT)
    terminees = sum(1 for a in actions if a.statut == StatutAction.FAIT)
    
    stats = {
        "total": len(ecarts),
        "critiques_a_30j": critiques_a_30j,
        "haute_priorite": haute_priorite,
        "terminees": terminees
    }
    
    return PlanTraitementResponse(
        ecarts=ecarts,
        actions_correctives=actions,
        stats=stats
    )


@router.patch("/projects/{project_id}/atelier1/activite4-statut")
async def update_activite4_statut(
    project_id: str,
    statut_update: ActiviteStatutUpdate,
    project: Project = Depends(require_atelier1_access),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update activity 4 status."""
    result = await db.execute(
        select(CadrageAtelier1).where(CadrageAtelier1.project_id == project_id)
    )
    cadrage = result.scalar_one_or_none()
    
    if not cadrage:
        cadrage = CadrageAtelier1(
            project_id=project_id,
            activite1_statut=ActiviteStatut.NON_DEMARRE,
            activite2_statut=ActiviteStatut.NON_DEMARRE,
            activite3_statut=ActiviteStatut.NON_DEMARRE,
            activite4_statut=statut_update.statut
        )
        db.add(cadrage)
    else:
        cadrage.activite4_statut = statut_update.statut
    
    await db.commit()
    
    return {"message": "Activity 4 status updated"}


@router.get("/projects/{project_id}/atelier1/progression")
async def get_progression(
    project_id: str,
    project: Project = Depends(require_atelier1_access),
    db: AsyncSession = Depends(get_db)
):
    """Get global progression of Atelier 1."""
    result = await db.execute(
        select(CadrageAtelier1).where(CadrageAtelier1.project_id == project_id)
    )
    cadrage = result.scalar_one_or_none()
    
    if not cadrage:
        return {
            "pourcentage": 0,
            "activite1_statut": ActiviteStatut.NON_DEMARRE.value,
            "activite2_statut": ActiviteStatut.NON_DEMARRE.value,
            "activite3_statut": ActiviteStatut.NON_DEMARRE.value,
            "activite4_statut": ActiviteStatut.NON_DEMARRE.value
        }
    
    statuts = [
        cadrage.activite1_statut,
        cadrage.activite2_statut,
        cadrage.activite3_statut,
        cadrage.activite4_statut
    ]
    
    # Calculate percentage: NON_DEMARRE=0%, EN_COURS=50%, TERMINE=100%
    statut_values = {
        ActiviteStatut.NON_DEMARRE: 0,
        ActiviteStatut.EN_COURS: 50,
        ActiviteStatut.TERMINE: 100
    }
    
    total = sum(statut_values[s] for s in statuts)
    pourcentage = total // 4  # Average of 4 activities
    
    return {
        "pourcentage": pourcentage,
        "activite1_statut": cadrage.activite1_statut.value,
        "activite2_statut": cadrage.activite2_statut.value,
        "activite3_statut": cadrage.activite3_statut.value,
        "activite4_statut": cadrage.activite4_statut.value
    }
