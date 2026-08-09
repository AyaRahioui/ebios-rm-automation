from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.atelier1 import (
    ActiviteStatut,
    Temporalite,
    Gravite,
    BienSupportType,
    Priorite,
    StatutAction,
    StatutControle,
    ImpactCategorie,
    DomaineMaturite,
)


# Cadrage schemas
class CadrageAtelier1Base(BaseModel):
    definition_activite: Optional[str] = None
    activites_metier_concernees: Optional[List[str]] = None
    ressources_necessaires: Optional[List[dict]] = None
    criteres: Optional[dict] = None
    temporalite: Optional[Temporalite] = None
    prochaine_revue: Optional[datetime] = None
    raci: Optional[List[dict]] = None
    rencontres_planifiees: Optional[List[dict]] = None
    outil_gestion_risques: Optional[str] = None
    cartographie_si_document_id: Optional[UUID] = None


class CadrageAtelier1Create(CadrageAtelier1Base):
    pass


class CadrageAtelier1Update(CadrageAtelier1Base):
    pass


class CadrageAtelier1Response(CadrageAtelier1Base):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    project_id: UUID
    activite1_statut: ActiviteStatut
    activite2_statut: ActiviteStatut
    activite3_statut: ActiviteStatut
    activite4_statut: ActiviteStatut
    created_at: datetime
    updated_at: datetime


class ActiviteStatutUpdate(BaseModel):
    statut: ActiviteStatut


# Valeur Métier schemas
class ValeurMetierBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    responsable_id: Optional[UUID] = None
    responsable_text: Optional[str] = None
    activite_metier_associee: Optional[str] = None
    besoin_disponibilite: int = Field(..., ge=1, le=4)
    besoin_integrite: int = Field(..., ge=1, le=4)
    besoin_confidentialite: int = Field(..., ge=1, le=4)


class ValeurMetierCreate(ValeurMetierBase):
    project_id: UUID


class ValeurMetierUpdate(ValeurMetierBase):
    pass


class ValeurMetierResponse(ValeurMetierBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    project_id: UUID
    created_at: datetime
    updated_at: datetime


class ValeurMetierListResponse(BaseModel):
    valeurs_metier: List[ValeurMetierResponse]
    total: int


# Bien Support schemas
class BienSupportBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=255)
    type: BienSupportType
    description: Optional[str] = None


class BienSupportCreate(BienSupportBase):
    valeur_metier_id: Optional[UUID] = None


class BienSupportUpdate(BienSupportBase):
    pass


class BienSupportResponse(BienSupportBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    valeur_metier_id: UUID
    created_at: datetime
    updated_at: datetime


class BienSupportListResponse(BaseModel):
    biens_supports: List[BienSupportResponse]
    total: int


# Critère Impact schemas
class CritereImpactBase(BaseModel):
    nom: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class CritereImpactCreate(CritereImpactBase):
    pass


class CritereImpactUpdate(CritereImpactBase):
    pass


class CritereImpactResponse(CritereImpactBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    created_at: datetime
    updated_at: datetime


class CritereImpactListResponse(BaseModel):
    criteres: List[CritereImpactResponse]
    total: int


# Événement Redouté schemas
class EvenementRedouteImpactBase(BaseModel):
    categorie: ImpactCategorie
    intensite: int = Field(..., ge=0, le=4)


class EvenementRedouteImpactCreate(EvenementRedouteImpactBase):
    pass


class EvenementRedouteImpactResponse(EvenementRedouteImpactBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    evenement_redoute_id: UUID


class EvenementRedouteBase(BaseModel):
    valeur_metier_id: UUID
    nom: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    gravite: Gravite = Gravite.G1
    gravite_surchargee: bool = False
    justification: Optional[str] = None
    criteres_dic: List[str] = Field(default_factory=list)  # ['D', 'I', 'C']
    validated_by_metier: bool = False
    validated_by_dg: bool = False
    commentaire_client: Optional[str] = None
    statut: str = "BROUILLON"
    impacts: Optional[List[EvenementRedouteImpactCreate]] = None


class EvenementRedouteCreate(EvenementRedouteBase):
    pass


class EvenementRedouteUpdate(EvenementRedouteBase):
    pass


class EvenementRedouteValidationUpdate(BaseModel):
    validated_by_metier: bool = False
    validated_by_dg: bool = False
    commentaire_client: Optional[str] = None


class EvenementRedouteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    valeur_metier_id: UUID
    nom: str
    description: Optional[str] = None
    gravite: Gravite
    gravite_surchargee: bool = False
    justification: Optional[str] = None
    criteres_dic: List[str] = Field(default_factory=list)
    validated_by_metier: bool = False
    validated_by_dg: bool = False
    commentaire_client: Optional[str] = None
    statut: str = "BROUILLON"
    impacts: Optional[List[EvenementRedouteImpactResponse]] = None
    created_at: datetime
    updated_at: datetime


class EvenementRedouteListResponse(BaseModel):
    evenements: List[EvenementRedouteResponse]
    total: int


class CartographieGraviteResponse(BaseModel):
    evenements_par_gravite: dict[str, List[EvenementRedouteResponse]]
    valeurs_metier_par_gravite: dict[str, List[ValeurMetierResponse]]


# Référentiel Sécurité schemas
class ReferentielSecuriteBase(BaseModel):
    project_id: UUID
    nom: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    activites_metier_concernees: Optional[List[str]] = None
    obligatoire: bool = False


class ReferentielSecuriteCreate(ReferentielSecuriteBase):
    pass


class ReferentielSecuriteUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    activites_metier_concernees: Optional[List[str]] = None
    obligatoire: Optional[bool] = None


class ReferentielSecuriteResponse(ReferentielSecuriteBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    created_at: datetime
    updated_at: datetime


class ReferentielSecuriteListResponse(BaseModel):
    referentiels: List[ReferentielSecuriteResponse]
    total: int


# Contrôle Conformité schemas
class ControleConformiteBase(BaseModel):
    referentiel_id: UUID
    activite_metier: str = Field(..., min_length=1, max_length=255)
    date_planifiee: datetime
    date_realisee: Optional[datetime] = None
    statut: StatutControle = StatutControle.PLANIFIE
    resultat: Optional[str] = None
    ecarts_identifies: Optional[str] = None
    niveau_maturite: Optional[int] = Field(None, ge=1, le=5)
    domaine: Optional[DomaineMaturite] = None


class ControleConformiteCreate(ControleConformiteBase):
    pass


class ControleConformiteUpdate(BaseModel):
    activite_metier: Optional[str] = Field(None, min_length=1, max_length=255)
    date_planifiee: Optional[datetime] = None
    date_realisee: Optional[datetime] = None
    statut: Optional[StatutControle] = None
    resultat: Optional[str] = None
    ecarts_identifies: Optional[str] = None
    niveau_maturite: Optional[int] = Field(None, ge=1, le=5)
    domaine: Optional[DomaineMaturite] = None


class ControleConformiteResponse(ControleConformiteBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    created_at: datetime
    updated_at: datetime


class ControleConformiteListResponse(BaseModel):
    controles: List[ControleConformiteResponse]
    total: int


class MaturiteSynthetiqueResponse(BaseModel):
    niveau_maturite_moyen: Optional[float]
    nombre_controles_evalues: int
    nombre_controles_total: int


# Action Corrective schemas
class ActionCorrectiveBase(BaseModel):
    controle_conformite_id: Optional[UUID] = None
    ecart_id: Optional[UUID] = None
    description: str = Field(..., min_length=1)
    priorite: Priorite = Priorite.MOYENNE
    responsable_id: Optional[UUID] = None
    responsable_text: Optional[str] = None
    date_prevue: Optional[datetime] = None
    statut: StatutAction = StatutAction.A_FAIRE
    inclus_plan_traitement: bool = False


class ActionCorrectiveCreate(ActionCorrectiveBase):
    pass


class ActionCorrectiveUpdate(BaseModel):
    controle_conformite_id: Optional[UUID] = None
    ecart_id: Optional[UUID] = None
    description: Optional[str] = Field(None, min_length=1)
    priorite: Optional[Priorite] = None
    responsable_id: Optional[UUID] = None
    responsable_text: Optional[str] = None
    date_prevue: Optional[datetime] = None
    statut: Optional[StatutAction] = None
    inclus_plan_traitement: Optional[bool] = None


class ActionCorrectiveResponse(ActionCorrectiveBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    created_at: datetime
    updated_at: datetime


class ActionCorrectiveListResponse(BaseModel):
    actions: List[ActionCorrectiveResponse]
    total: int


# Ecart schemas
class EcartBase(BaseModel):
    project_id: UUID
    controle_id: Optional[UUID] = None
    domaine: DomaineMaturite
    referentiel_id: Optional[UUID] = None
    description: str = Field(..., min_length=1)
    cause: Optional[str] = None
    numero: int


class EcartCreate(EcartBase):
    pass


class EcartUpdate(BaseModel):
    controle_id: Optional[UUID] = None
    domaine: Optional[DomaineMaturite] = None
    referentiel_id: Optional[UUID] = None
    description: Optional[str] = Field(None, min_length=1)
    cause: Optional[str] = None


class EcartResponse(EcartBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    created_at: datetime
    updated_at: datetime


class EcartListResponse(BaseModel):
    ecarts: List[EcartResponse]
    total: int


# Maturité par domaine response
class MaturiteParDomaineResponse(BaseModel):
    domaine: DomaineMaturite
    niveau_moyen: Optional[float]
    pourcentage: float
    nb_controles_evalues: int
    nb_controles_total: int


class MaturiteParDomaineListResponse(BaseModel):
    domaines: List[MaturiteParDomaineResponse]


# Plan de traitement response
class PlanTraitementStats(BaseModel):
    total: int
    critiques_a_30j: int
    haute_priorite: int
    terminees: int


class PlanTraitementResponse(BaseModel):
    ecarts: List[EcartResponse]
    actions_correctives: List[ActionCorrectiveResponse]
    stats: PlanTraitementStats
