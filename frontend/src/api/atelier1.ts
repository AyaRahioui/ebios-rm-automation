import apiClient from './client';

// Types
export type ActiviteStatut = 'NON_DEMARRE' | 'EN_COURS' | 'TERMINE';
export type Temporalite = 'TRIMESTRIEL' | 'SEMESTRIEL' | 'ANNUEL' | 'CONTINU';
export type Gravite = 'G1' | 'G2' | 'G3' | 'G4' | 'G5';
export type BienSupportType = 'DONNEE' | 'LOGICIEL' | 'MATERIEL' | 'RESEAU' | 'PERSONNEL' | 'SITE' | 'ORGANISATION';
export type Priorite = 'FAIBLE' | 'MOYENNE' | 'HAUTE' | 'CRITIQUE';
export type StatutAction = 'A_FAIRE' | 'EN_COURS' | 'FAIT' | 'REPORTE';
export type StatutControle = 'PLANIFIE' | 'EN_COURS' | 'EFFECTUE' | 'ANNULE' | 'NON_CONFORME';
export type DomaineMaturite = 'GESTION_TIERS' | 'SECURITE_INFO' | 'SECURITE_DEV' | 'GESTION_PERSONNEL';

export interface CadrageAtelier1 {
  id?: string;
  project_id: string;
  definition_activite?: string;
  activites_metier_concernees?: string[];
  ressources_necessaires?: any[];
  criteres?: any;
  temporalite?: Temporalite;
  prochaine_revue?: string;
  raci?: any[];
  rencontres_planifiees?: any[];
  outil_gestion_risques?: string;
  cartographie_si_document_id?: string;
  activite1_statut: ActiviteStatut;
  activite2_statut: ActiviteStatut;
  activite3_statut: ActiviteStatut;
  activite4_statut: ActiviteStatut;
  created_at?: string;
  updated_at?: string;
}

export interface ValeurMetier {
  id?: string;
  project_id: string;
  nom: string;
  description?: string;
  responsable_id?: string;
  responsable_text?: string;
  activite_metier_associee?: string;
  besoin_disponibilite: number;
  besoin_integrite: number;
  besoin_confidentialite: number;
  created_at?: string;
  updated_at?: string;
}

export interface BienSupport {
  id?: string;
  valeur_metier_id: string;
  nom: string;
  type: BienSupportType;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CritereImpact {
  id: string;
  nom: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EvenementRedouteImpact {
  categorie: string;
  intensite: number;
}

export interface EvenementRedoute {
  id?: string;
  valeur_metier_id: string;
  nom: string;
  description?: string;
  gravite: Gravite;
  gravite_surchargee: boolean;
  justification?: string;
  criteres_dic?: string[];
  validated_by_metier?: boolean;
  validated_by_dg?: boolean;
  commentaire_client?: string;
  statut?: string;
  impacts?: EvenementRedouteImpact[];
  created_at?: string;
  updated_at?: string;
}

export interface ReferentielSecurite {
  id?: string;
  project_id: string;
  nom: string;
  description?: string;
  activites_metier_concernees?: string[];
  obligatoire: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ControleConformite {
  id?: string;
  referentiel_id: string;
  activite_metier: string;
  date_planifiee: string;
  date_realisee?: string;
  statut: StatutControle;
  resultat?: string;
  ecarts_identifies?: string;
  niveau_maturite?: number;
  domaine?: DomaineMaturite;
  created_at?: string;
  updated_at?: string;
}

export interface ActionCorrective {
  id?: string;
  controle_conformite_id?: string;
  ecart_id?: string;
  description: string;
  priorite: Priorite;
  responsable_id?: string;
  responsable_text?: string;
  date_prevue?: string;
  statut: StatutAction;
  inclus_plan_traitement: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Ecart {
  id?: string;
  project_id: string;
  controle_id?: string;
  domaine: DomaineMaturite;
  referentiel_id?: string;
  description: string;
  cause?: string;
  numero: number;
  created_at?: string;
  updated_at?: string;
}

export interface MaturiteParDomaine {
  domaine: DomaineMaturite;
  niveau_moyen: number | null;
  pourcentage: number;
  nb_controles_evalues: number;
  nb_controles_total: number;
}

export interface PlanTraitementStats {
  total: number;
  critiques_a_30j: number;
  haute_priorite: number;
  terminees: number;
}

export interface PlanTraitement {
  ecarts: Ecart[];
  actions_correctives: ActionCorrective[];
  stats: PlanTraitementStats;
}

export interface Progression {
  pourcentage: number;
  activite1_statut: ActiviteStatut;
  activite2_statut: ActiviteStatut;
  activite3_statut: ActiviteStatut;
  activite4_statut: ActiviteStatut;
}

// API Functions
export const atelier1Api = {
  // Progression
  getProgression: (projectId: string) =>
    apiClient.get<Progression>(`/projects/${projectId}/atelier1/progression`),

  // Activité 1 - Cadrage
  getCadrage: (projectId: string) =>
    apiClient.get<CadrageAtelier1>(`/projects/${projectId}/atelier1/cadrage`),
  
  upsertCadrage: (projectId: string, data: Partial<CadrageAtelier1>) =>
    apiClient.put<CadrageAtelier1>(`/projects/${projectId}/atelier1/cadrage`, data),
  
  updateActivite1Statut: (projectId: string, statut: ActiviteStatut) =>
    apiClient.patch(`/projects/${projectId}/atelier1/activite1-statut`, { statut }),

  // Activité 2 - Valeurs Métier & Biens Supports
  getValeursMetier: (projectId: string) =>
    apiClient.get<{ valeurs_metier: ValeurMetier[]; total: number }>(`/projects/${projectId}/atelier1/valeurs-metier`),
  
  createValeurMetier: (projectId: string, data: Partial<ValeurMetier>) =>
    apiClient.post<ValeurMetier>(`/projects/${projectId}/atelier1/valeurs-metier`, data),
  
  updateValeurMetier: (valeurId: string, data: Partial<ValeurMetier>) =>
    apiClient.patch<ValeurMetier>(`/valeurs-metier/${valeurId}`, data),
  
  deleteValeurMetier: (valeurId: string) =>
    apiClient.delete(`/valeurs-metier/${valeurId}`),
  
  getBiensSupports: (valeurId: string) =>
    apiClient.get<{ biens_supports: BienSupport[]; total: number }>(`/valeurs-metier/${valeurId}/biens-supports`),
  
  createBienSupport: (valeurId: string, data: Partial<BienSupport>) =>
    apiClient.post<BienSupport>(`/valeurs-metier/${valeurId}/biens-supports`, data),
  
  updateBienSupport: (bienId: string, data: Partial<BienSupport>) =>
    apiClient.patch<BienSupport>(`/biens-supports/${bienId}`, data),
  
  deleteBienSupport: (bienId: string) =>
    apiClient.delete(`/biens-supports/${bienId}`),
  
  updateActivite2Statut: (projectId: string, statut: ActiviteStatut) =>
    apiClient.patch(`/projects/${projectId}/atelier1/activite2-statut`, { statut }),

  // Activité 3 - Événements Redoutés
  getCriteresImpact: (projectId: string) =>
    apiClient.get<{ criteres: CritereImpact[]; total: number }>(`/projects/${projectId}/atelier1/criteres-impact`),
  
  getEvenementsRedoutes: (projectId: string) =>
    apiClient.get<{ evenements: EvenementRedoute[]; total: number }>(`/projects/${projectId}/atelier1/evenements-redoutes`),
  
  createEvenementRedoute: (projectId: string, data: Partial<EvenementRedoute>) =>
    apiClient.post<EvenementRedoute>(`/projects/${projectId}/atelier1/evenements-redoutes`, data),
  
  updateEvenementRedoute: (evenementId: string, data: Partial<EvenementRedoute>) =>
    apiClient.patch<EvenementRedoute>(`/evenements-redoutes/${evenementId}`, data),
  
  deleteEvenementRedoute: (evenementId: string) =>
    apiClient.delete(`/evenements-redoutes/${evenementId}`),

  validateEvenementRedoute: (evenementId: string, data: { validated_by_metier: boolean; validated_by_dg: boolean; commentaire_client?: string }) =>
    apiClient.patch(`/evenements-redoutes/${evenementId}/validation`, data),

  getCartographieGravite: (projectId: string) =>
    apiClient.get<{
      evenements_par_gravite: Record<string, EvenementRedoute[]>;
      valeurs_metier_par_gravite: Record<string, ValeurMetier[]>;
    }>(`/projects/${projectId}/atelier1/cartographie-gravite`),
  
  updateActivite3Statut: (projectId: string, statut: ActiviteStatut) =>
    apiClient.patch(`/projects/${projectId}/atelier1/activite3-statut`, { statut }),

  // Activité 4 - Référentiels, Contrôles, Actions Correctives
  getReferentiels: (projectId: string) =>
    apiClient.get<{ referentiels: ReferentielSecurite[]; total: number }>(`/projects/${projectId}/atelier1/referentiels`),
  
  createReferentiel: (projectId: string, data: Partial<ReferentielSecurite>) =>
    apiClient.post<ReferentielSecurite>(`/projects/${projectId}/atelier1/referentiels`, data),
  
  updateReferentiel: (referentielId: string, data: Partial<ReferentielSecurite>) =>
    apiClient.patch<ReferentielSecurite>(`/referentiels/${referentielId}`, data),
  
  deleteReferentiel: (projectId: string, referentielId: string) =>
    apiClient.delete(`/projects/${projectId}/atelier1/referentiels/${referentielId}`),
  
  getControlesConformite: (projectId: string) =>
    apiClient.get<{ controles: ControleConformite[]; total: number }>(`/projects/${projectId}/atelier1/controles-conformite`),
  
  createControleConformite: (projectId: string, data: Partial<ControleConformite>) =>
    apiClient.post<ControleConformite>(`/projects/${projectId}/atelier1/controles-conformite`, data),
  
  updateControleConformite: (controleId: string, data: Partial<ControleConformite>) =>
    apiClient.patch<ControleConformite>(`/controles-conformite/${controleId}`, data),
  
  deleteControleConformite: (projectId: string, controleId: string) =>
    apiClient.delete(`/projects/${projectId}/atelier1/controles-conformite/${controleId}`),
  
  getMaturiteSynthetique: (projectId: string) =>
    apiClient.get<{
      niveau_maturite_moyen: number | null;
      nombre_controles_evalues: number;
      nombre_controles_total: number;
    }>(`/projects/${projectId}/atelier1/maturite-synthetique`),
  
  getActionsCorrectives: (projectId: string) =>
    apiClient.get<{ actions: ActionCorrective[]; total: number }>(`/projects/${projectId}/atelier1/actions-correctives`),
  
  createActionCorrective: (projectId: string, data: Partial<ActionCorrective>) =>
    apiClient.post<ActionCorrective>(`/projects/${projectId}/atelier1/actions-correctives`, data),
  
  updateActionCorrective: (actionId: string, data: Partial<ActionCorrective>) =>
    apiClient.patch<ActionCorrective>(`/actions-correctives/${actionId}`, data),
  
  deleteActionCorrective: (projectId: string, actionId: string) =>
    apiClient.delete(`/projects/${projectId}/atelier1/actions-correctives/${actionId}`),
  
  updateActivite4Statut: (projectId: string, statut: ActiviteStatut) =>
    apiClient.patch(`/projects/${projectId}/atelier1/activite4-statut`, { statut }),

  // Écarts
  getEcarts: (projectId: string) =>
    apiClient.get<{ ecarts: Ecart[]; total: number }>(`/projects/${projectId}/atelier1/ecarts`),

  createEcart: (projectId: string, data: Partial<Ecart>) =>
    apiClient.post<Ecart>(`/projects/${projectId}/atelier1/ecarts`, data),

  updateEcart: (projectId: string, ecartId: string, data: Partial<Ecart>) =>
    apiClient.patch(`/projects/${projectId}/atelier1/ecarts/${ecartId}`, data),

  deleteEcart: (projectId: string, ecartId: string) =>
    apiClient.delete(`/projects/${projectId}/atelier1/ecarts/${ecartId}`),

  // Maturité par domaine
  getMaturiteParDomaine: (projectId: string) =>
    apiClient.get<{ domaines: MaturiteParDomaine[] }>(`/projects/${projectId}/atelier1/maturite-par-domaine`),

  // Plan de traitement
  getPlanTraitement: (projectId: string) =>
    apiClient.get<PlanTraitement>(`/projects/${projectId}/atelier1/plan-traitement`),
};
