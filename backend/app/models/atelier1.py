import uuid
from datetime import datetime
from sqlalchemy import String, Text, Enum as SQLEnum, ForeignKey, JSON, Index, Date, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
import enum


class ActiviteStatut(str, enum.Enum):
    NON_DEMARRE = "NON_DEMARRE"
    EN_COURS = "EN_COURS"
    TERMINE = "TERMINE"


class Temporalite(str, enum.Enum):
    TRIMESTRIEL = "TRIMESTRIEL"
    SEMESTRIEL = "SEMESTRIEL"
    ANNUEL = "ANNUEL"
    CONTINU = "CONTINU"


class Gravite(str, enum.Enum):
    G1 = "G1"
    G2 = "G2"
    G3 = "G3"
    G4 = "G4"
    G5 = "G5"


class BienSupportType(str, enum.Enum):
    DONNEE = "DONNEE"
    LOGICIEL = "LOGICIEL"
    MATERIEL = "MATERIEL"
    RESEAU = "RESEAU"
    PERSONNEL = "PERSONNEL"
    SITE = "SITE"
    ORGANISATION = "ORGANISATION"


class Priorite(str, enum.Enum):
    FAIBLE = "FAIBLE"
    MOYENNE = "MOYENNE"
    HAUTE = "HAUTE"
    CRITIQUE = "CRITIQUE"


class StatutAction(str, enum.Enum):
    A_FAIRE = "A_FAIRE"
    EN_COURS = "EN_COURS"
    FAIT = "FAIT"


class StatutControle(str, enum.Enum):
    PLANIFIE = "PLANIFIE"
    EN_COURS = "EN_COURS"
    EFFECTUE = "EFFECTUE"
    ANNULE = "ANNULE"
    NON_CONFORME = "NON_CONFORME"


class DomaineMaturite(str, enum.Enum):
    GESTION_TIERS = "GESTION_TIERS"
    SECURITE_INFO = "SECURITE_INFO"
    SECURITE_DEV = "SECURITE_DEV"
    GESTION_PERSONNEL = "GESTION_PERSONNEL"


class ImpactCategorie(str, enum.Enum):
    MISSIONS = "MISSIONS"
    HUMAIN = "HUMAIN"
    MATERIEL = "MATERIEL"
    ENVIRONNEMENTAL = "ENVIRONNEMENTAL"
    GOUVERNANCE = "GOUVERNANCE"
    FINANCIER = "FINANCIER"
    JURIDIQUE = "JURIDIQUE"
    IMAGE = "IMAGE"


class CadrageAtelier1(Base):
    __tablename__ = "cadrage_atelier1"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Activité 1 fields
    definition_activite: Mapped[str | None] = mapped_column(Text, nullable=True)
    activites_metier_concernees: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    ressources_necessaires: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    criteres: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    temporalite: Mapped[Temporalite | None] = mapped_column(SQLEnum(Temporalite), nullable=True)
    prochaine_revue: Mapped[datetime | None] = mapped_column(nullable=True)
    raci: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    rencontres_planifiees: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    outil_gestion_risques: Mapped[str | None] = mapped_column(Text, nullable=True)
    cartographie_si_document_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("documents.id"), nullable=True)
    
    # Activity status tracking
    activite1_statut: Mapped[ActiviteStatut] = mapped_column(SQLEnum(ActiviteStatut), nullable=False, default=ActiviteStatut.NON_DEMARRE)
    activite2_statut: Mapped[ActiviteStatut] = mapped_column(SQLEnum(ActiviteStatut), nullable=False, default=ActiviteStatut.NON_DEMARRE)
    activite3_statut: Mapped[ActiviteStatut] = mapped_column(SQLEnum(ActiviteStatut), nullable=False, default=ActiviteStatut.NON_DEMARRE)
    activite4_statut: Mapped[ActiviteStatut] = mapped_column(SQLEnum(ActiviteStatut), nullable=False, default=ActiviteStatut.NON_DEMARRE)
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), onupdate=datetime.utcnow, nullable=False)


class ValeurMetier(Base):
    __tablename__ = "valeurs_metier"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    responsable_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    responsable_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    activite_metier_associee: Mapped[str | None] = mapped_column(String(255), nullable=True)
    besoin_disponibilite: Mapped[int] = mapped_column(nullable=False, default=1)
    besoin_integrite: Mapped[int] = mapped_column(nullable=False, default=1)
    besoin_confidentialite: Mapped[int] = mapped_column(nullable=False, default=1)
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index('ix_valeur_metier_project', 'project_id'),
    )


class BienSupport(Base):
    __tablename__ = "biens_supports"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    valeur_metier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("valeurs_metier.id", ondelete="CASCADE"), nullable=False, index=True)
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[BienSupportType] = mapped_column(SQLEnum(BienSupportType), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), onupdate=datetime.utcnow, nullable=False)


class CritereImpact(Base):
    __tablename__ = "criteres_impact"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), onupdate=datetime.utcnow, nullable=False)


class EvenementRedoute(Base):
    __tablename__ = "evenements_redoutes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    valeur_metier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("valeurs_metier.id", ondelete="CASCADE"), nullable=False, index=True)
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    gravite: Mapped[Gravite] = mapped_column(SQLEnum(Gravite), nullable=False, default=Gravite.G1)
    gravite_surchargee: Mapped[bool] = mapped_column(nullable=False, default=False)
    justification: Mapped[str | None] = mapped_column(Text, nullable=True)
    criteres_dic: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)  # ['D', 'I', 'C']
    validated_by_metier: Mapped[bool] = mapped_column(nullable=False, default=False)
    validated_by_dg: Mapped[bool] = mapped_column(nullable=False, default=False)
    commentaire_client: Mapped[str | None] = mapped_column(Text, nullable=True)
    statut: Mapped[str] = mapped_column(String(50), nullable=False, default="BROUILLON")  # BROUILLON|PROPOSE|VALIDE_METIER|VALIDE_FINAL
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), onupdate=datetime.utcnow, nullable=False)


class EvenementRedouteImpact(Base):
    __tablename__ = "evenements_redoutes_impacts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    evenement_redoute_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("evenements_redoutes.id", ondelete="CASCADE"), nullable=False, index=True)
    categorie: Mapped[ImpactCategorie] = mapped_column(SQLEnum(ImpactCategorie), nullable=False)
    intensite: Mapped[int] = mapped_column(nullable=False)  # 0-4

    __table_args__ = (
        Index('ix_evenement_impact_evenement', 'evenement_redoute_id'),
    )

    # Note: This table doesn't have created_at/updated_at columns


class ReferentielSecurite(Base):
    __tablename__ = "referentiels_securite"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    activites_metier_concernees: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    obligatoire: Mapped[bool] = mapped_column(nullable=False, default=False)
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), onupdate=datetime.utcnow, nullable=False)


class ControleConformite(Base):
    __tablename__ = "controles_conformite"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    referentiel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("referentiels_securite.id", ondelete="CASCADE"), nullable=False, index=True)
    activite_metier: Mapped[str] = mapped_column(String(255), nullable=False)
    date_planifiee: Mapped[datetime] = mapped_column(nullable=False)
    date_realisee: Mapped[datetime | None] = mapped_column(nullable=True)
    statut: Mapped[StatutControle] = mapped_column(SQLEnum(StatutControle), nullable=False, default=StatutControle.PLANIFIE)
    resultat: Mapped[str | None] = mapped_column(Text, nullable=True)
    ecarts_identifies: Mapped[str | None] = mapped_column(Text, nullable=True)
    niveau_maturite: Mapped[int | None] = mapped_column(nullable=True)
    domaine: Mapped[DomaineMaturite | None] = mapped_column(SQLEnum(DomaineMaturite), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), onupdate=datetime.utcnow, nullable=False)


class ActionCorrective(Base):
    __tablename__ = "actions_correctives"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    controle_conformite_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("controles_conformite.id", ondelete="SET NULL"), nullable=True, index=True)
    ecart_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ecarts.id", ondelete="SET NULL"), nullable=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    priorite: Mapped[Priorite] = mapped_column(SQLEnum(Priorite), nullable=False, default=Priorite.MOYENNE)
    responsable_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    responsable_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date_prevue: Mapped[datetime | None] = mapped_column(nullable=True)
    statut: Mapped[StatutAction] = mapped_column(SQLEnum(StatutAction), nullable=False, default=StatutAction.A_FAIRE)
    inclus_plan_traitement: Mapped[bool] = mapped_column(nullable=False, default=False)
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), onupdate=datetime.utcnow, nullable=False)


class Ecart(Base):
    __tablename__ = "ecarts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    controle_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("controles_conformite.id", ondelete="SET NULL"), nullable=True, index=True)
    domaine: Mapped[DomaineMaturite] = mapped_column(SQLEnum(DomaineMaturite), nullable=False)
    referentiel_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("referentiels_securite.id", ondelete="SET NULL"), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    numero: Mapped[int] = mapped_column(nullable=False)  # Numérotation automatique EC-01, EC-02, etc.
    
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, server_default=func.now(), onupdate=datetime.utcnow, nullable=False)
