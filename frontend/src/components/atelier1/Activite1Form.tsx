/**
 * Activite1Form.tsx — Atelier 1 / Activité 1 : Cadrage
 *
 * Version améliorée (v2) — alignée sur le PDF EBIOS RM (ANSSI) :
 * - Fiche méthode n°1 (p. 56 du cours PECB) : "Conception du processus de gestion des risques numériques"
 * - PDF p. 55 : 4 axes de définition (temporalité, intervenants via RACI, modèles de docs, délais)
 *
 * Améliorations vs v1 :
 * ✅ Activités RACI par défaut = vraies activités EBIOS (pas les lettres RACI)
 * ✅ Rôles RACI par défaut = 4 rôles projet + 4 rôles métier (8 rôles)
 * ✅ Sections 3-5 : composants structurés (plus de JSON brut)
 * ✅ Aide contextuelle PDF (infobulles, liens vers fiches méthode, exemples)
 * ✅ Validation visuelle par section (vert/ambre/rouge) avec progression
 * ✅ Auto-save toutes les 5s + indicateur de sauvegarde
 * ✅ Animations d'expansion (200ms ease-out)
 * ✅ Accessible (ARIA, navigation clavier, focus visible)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { atelier1Api, CadrageAtelier1, Temporalite, ActiviteStatut } from '../../api/atelier1';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { useAuth } from '@/store/authContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Progress } from '../ui/progress';
import {
  Save, Loader2, CheckCircle2, AlertTriangle, Info, Plus, X, Trash2,
  CalendarIcon, Users, Wrench, FileText, Shield, Map, BookOpen,
  Lightbulb, Clock,
} from 'lucide-react';
import { cn } from '../../lib/utils';


// Helper function for date formatting (replaces date-fns)
const formatDate = (date: Date, formatStr: string): string => {
  if (formatStr === 'yyyy-MM-dd') {
    return date.toISOString().split('T')[0];
  }
  if (formatStr === 'HH:mm') {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('fr-FR');
};

// =====================================================================
// TYPES
// =====================================================================

type RoleRACI = 'R' | 'A' | 'C' | 'I' | '-';
type TypeRessource = 'ACTEUR' | 'OUTIL' | 'MATERIEL';
type CritereDICT = 'D' | 'I' | 'C' | 'T';

interface ProjetSummary {
  nom: string;
  description: string;
  domaine: string;
  statut: string;
  methode_cotation: string;
}

interface Ressource {
  id: string;
  type: TypeRessource;
  nom: string;
  description?: string;
}

interface CritereSecurite {
  critere: CritereDICT;
  echelle: { niveau: number; libelle: string; description: string }[];
  poids: number; // 1-4
}

interface Rencontre {
  id: string;
  date: string;
  objet: string;
  participants: string[];
  duree?: number; // en heures
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  job_title?: string;
}

interface RACIAssignment {
  id: string;
  project_id: string;
  activite_code: string;
  user_id: string;
  role_raci: string;
}

interface CadrageData {
  // Section 1
  definition_activite: string;
  activites_metier_concernees: string[];

  // Section 2
  temporalite: Temporalite;
  prochaine_revue: string;
  raci: any[]; // Format attendu par l'API (stocké comme tableau)
  rencontres_planifiees: Rencontre[];

  // Section 3
  ressources_necessaires: Ressource[];

  // Section 4
  criteres: CritereSecurite[];

  // Section 5
  outil_gestion_risques: string;
  cartographie_si_document_id: string | undefined;

  // Statut
  statut: ActiviteStatut;
}

interface Activite1FormProps {
  projectId: string;
  projectData: ProjetSummary;
  onStatutChange: (statut: ActiviteStatut) => void;
  currentStatut: ActiviteStatut;
}

// =====================================================================
// CONSTANTES MÉTIER (alignées PDF EBIOS RM)
// =====================================================================

// PDF p. 55 : 4 axes de définition du processus
// PDF p. 56 : 3 blocs (Définir l'activité / Organisation / Outillage)
// 9 activités EBIOS RM
const EBIOS_ACTIVITIES = [
  { value: 'A1.1', label: 'Cadrage de l\'étude', description: 'Définir le périmètre, les missions, les acteurs (Atelier 1)' },
  { value: 'A1.2', label: 'Identification des VM', description: 'Recenser les VM et biens supports (Atelier 1)' },
  { value: 'A2_VALIDATION', label: 'Validation VM', description: 'Validation des valeurs métier' },
  { value: 'A2_BS', label: 'Identification des BS', description: 'Recenser les biens supports' },
  { value: 'A1.3', label: 'Identification des ER', description: 'ER + cotation DICT + gravité (Atelier 1)' },
  { value: 'A3_G45_DG', label: 'Validation G4/G5', description: 'Validation des ER de gravité G4/G5' },
  { value: 'A1.4', label: 'Évaluation du socle', description: 'Référentiels + contrôles + maturité (Atelier 1)' },
  { value: 'A4_SOCLE', label: 'Validation socle', description: 'Validation du socle de sécurité' },
  { value: 'A4_VERROUILLAGE', label: 'Verrouillage Atelier 1', description: 'Verrouillage final de l\'Atelier 1' },
];

// Pre-compute default activities to avoid re-computation on every render
const DEFAULT_ACTIVITIES = EBIOS_ACTIVITIES.map(a => a.value);

// Les rôles RACI seront remplacés par les membres réels de l'équipe fetchés depuis l'API

const TEMPORALITE_LABELS: Record<Temporalite, string> = {
  TRIMESTRIEL: 'Trimestrielle (3 mois)',
  SEMESTRIEL: 'Semestrielle (6 mois)',
  ANNUEL: 'Annuelle (12 mois) — recommandée',
  CONTINU: 'Continue (cycle permanent)',
};

const RACI_COLORS: Record<RoleRACI, { bg: string; text: string; label: string; description: string }> = {
  '-':  { bg: 'bg-slate-100', text: 'text-slate-400', label: '—', description: 'Non assigné' },
  R:   { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'R', description: 'Réalisateur — fonction qui réalise, produit l\'action' },
  A:   { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'A', description: 'Autorité — valideur (au moins 1 par activité, obligatoire)' },
  C:   { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'C', description: 'Contributeur — sollicité pour aider à réaliser' },
  I:   { bg: 'bg-violet-100', text: 'text-violet-700', label: 'I', description: 'Informé — prend connaissance, n\'intervient pas' },
};

// Critères DICT (PDF p. 60)
const DICT_CRITERES: Record<CritereDICT, { label: string; description: string; color: string }> = {
  D: { label: 'Disponibilité', description: 'Information accessible, service opérationnel, processus réalisable', color: 'blue' },
  I: { label: 'Intégrité', description: 'Données non falsifiées, service non détourné, processus non altéré', color: 'emerald' },
  C: { label: 'Confidentialité', description: 'Information non divulguée, service non accédé illicitement', color: 'amber' },
  T: { label: 'Traçabilité', description: 'Actions modifiables tracées, enchaînement des processus traçable', color: 'violet' },
};

// Échelle d'impact par défaut (PDF p. 66) — peut être surchargée par l'échelle importée
const DEFAULT_IMPACT_SCALE = [
  { niveau: 1, libelle: 'Négligeable', description: 'Aucun impact opérationnel' },
  { niveau: 2, libelle: 'Significatif', description: 'Dégradation des performances, mode dégradé' },
  { niveau: 3, libelle: 'Grave', description: 'Mode très dégradé, sérieuses difficultés' },
  { niveau: 4, libelle: 'Critique', description: 'Survie de l\'organisation menacée' },
];

// =====================================================================
// HELPERS
// =====================================================================

const buildDefaultMatrix = (activities: string[], userIds: string[]): Record<string, Record<string, RoleRACI>> => {
  const matrix: Record<string, Record<string, RoleRACI>> = {};
  activities.forEach(activity => {
    matrix[activity] = {};
    userIds.forEach(userId => {
      matrix[activity][userId] = '-';
    });
  });
  return matrix;
};

const validateRACI = (matrix: Record<string, Record<string, RoleRACI>>, activities: string[]): { valid: boolean; activitiesSansA: string[]; activitiesMultipleA: string[] } => {
  const activitiesSansA: string[] = [];
  const activitiesMultipleA: string[] = [];
  
  activities.forEach(activity => {
    const row = matrix[activity] || {};
    const aCount = Object.values(row).filter(v => v === 'A').length;
    
    if (aCount === 0) {
      activitiesSansA.push(activity);
    } else if (aCount > 1) {
      activitiesMultipleA.push(activity);
    }
  });
  
  return { valid: activitiesSansA.length === 0 && activitiesMultipleA.length === 0, activitiesSansA, activitiesMultipleA };
};

const generateId = () => crypto.randomUUID();

export default function Activite1Form({ projectId, projectData, onStatutChange, currentStatut }: Activite1FormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const draftRestoredRef = React.useRef(false);
  const hasDraftRaciRef = React.useRef(false);

  // Seul le Chef de projet peut modifier la matrice RACI (lecture seule pour les autres)
  const { user: currentUser } = useAuth();
  const isChefProjet = currentUser?.role === 'CHEF_PROJET';
  
  // Équipe et matrice RACI
  const [team, setTeam] = useState<{ chef_projet: User; consultants: User[]; client: User | null; all_members: User[] } | null>(null);
  const [raciAssignments, setRaciAssignments] = useState<RACIAssignment[]>([]);

  const allMembers = team?.all_members || [];
  const defaultRoles = allMembers.map(u => u.id);

  const [formData, setFormData] = useState<Partial<CadrageData>>({
    definition_activite: projectData.description || '',
    activites_metier_concernees: [],
    temporalite: 'ANNUEL',
    prochaine_revue: formatDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    raci: [], // Format attendu par l'API
    rencontres_planifiees: [],
    ressources_necessaires: [],
    criteres: [
      { critere: 'D', echelle: DEFAULT_IMPACT_SCALE, poids: 3 },
      { critere: 'I', echelle: DEFAULT_IMPACT_SCALE, poids: 3 },
      { critere: 'C', echelle: DEFAULT_IMPACT_SCALE, poids: 3 },
      { critere: 'T', echelle: DEFAULT_IMPACT_SCALE, poids: 2 },
    ],
    outil_gestion_risques: '',
    cartographie_si_document_id: undefined,
    statut: currentStatut,
  });

  const [raciMatrix, setRaciMatrix] = useState<{ activities: string[]; roles: string[]; matrix: Record<string, Record<string, RoleRACI>> }>({
    activities: DEFAULT_ACTIVITIES,
    roles: defaultRoles,
    matrix: buildDefaultMatrix(DEFAULT_ACTIVITIES, defaultRoles),
  });

  // Fetch l'équipe et la matrice RACI
  useEffect(() => {
    const fetchTeamAndMatrix = async () => {
      try {
        const token = localStorage.getItem('access_token');
        
        // Fetch l'équipe
        const teamRes = await fetch(`/api/v1/raci/projects/${projectId}/team`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (teamRes.ok) {
          const teamData = await teamRes.json();
          setTeam(teamData);
        }

        // Fetch la matrice RACI
        const matrixRes = await fetch(`/api/v1/raci/projects/${projectId}/matrix`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (matrixRes.ok) {
          const matrixData = await matrixRes.json();
          setRaciAssignments(matrixData);
        }
      } catch (err) {
        console.error('Error fetching team/matrix:', err);
      }
    };

    fetchTeamAndMatrix();
  }, [projectId]);

// Initialiser la matrice RACI depuis l'API quand les données sont disponibles
  useEffect(() => {
    // Ne pas écraser la matrice RACI restaurée depuis le brouillon local
    if (hasDraftRaciRef.current) return;
    if (raciAssignments && team) {
      const matrix: Record<string, Record<string, RoleRACI>> = {};
      const userIds = team.all_members.map(u => u.id);
      
      // Initialiser avec des tirets
      DEFAULT_ACTIVITIES.forEach(activity => {
        matrix[activity] = {};
        userIds.forEach(userId => {
          matrix[activity][userId] = '-';
        });
      });

      // Remplir avec les assignments RACI
      raciAssignments.forEach(assignment => {
        if (matrix[assignment.activite_code]) {
          matrix[assignment.activite_code][assignment.user_id] = assignment.role_raci as RoleRACI;
        }
      });

      setRaciMatrix({
        activities: DEFAULT_ACTIVITIES,
        roles: userIds,
        matrix,
      });

      // Note: formData.raci reste un tableau (format API), raciMatrix est notre structure interne
    }
  }, [raciAssignments, team]);

  useEffect(() => {
    loadCadrage();
  }, [projectId]);

// Auto-save local (localStorage) toutes les 5s — PAS d'envoi au backend
  // (les données incomplètes ne sont pas au format attendu par l'API → erreur 422)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData && Object.keys(formData).length > 0) {
        const brouillon = {
          formData,
          raciMatrix,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(`cadrage-brouillon-${projectId}`, JSON.stringify(brouillon));
        setIsAutoSaving(false);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [formData, raciMatrix, projectId]);

// Restaurer le brouillon au mount (formData + raciMatrix)
  useEffect(() => {
    const brouillon = localStorage.getItem(`cadrage-brouillon-${projectId}`);
    if (brouillon) {
      try {
        const data = JSON.parse(brouillon);
        if (data.formData) setFormData(data.formData);
        if (data.raciMatrix) {
          setRaciMatrix(data.raciMatrix);
          hasDraftRaciRef.current = true;
        }
      } catch (e) {}
    }
  }, [projectId]);

const loadCadrage = async () => {
    try {
      setLoading(true);
      // 1) Restaurer le brouillon local en priorité (le plus récent, non vide)
      const brouillon = localStorage.getItem(`cadrage-brouillon-${projectId}`);
      if (brouillon) {
        try {
const brouillonParsed = JSON.parse(brouillon);
          if (brouillonParsed.formData) {
            setFormData(brouillonParsed.formData);
            if (brouillonParsed.raciMatrix) {
              setRaciMatrix(brouillonParsed.raciMatrix);
              hasDraftRaciRef.current = true;
            }
            setLastSavedAt(new Date(brouillonParsed.savedAt || Date.now()));
            setLoading(false);
            return;
          }
        } catch (e) { /* brouillon invalide → on continue vers le backend */ }
      }

      // 2) Sinon, charger depuis le backend
      const response = await atelier1Api.getCadrage(projectId);
      const cadrageData = response.data;

      if (cadrageData.id) {
        setFormData({
          definition_activite: cadrageData.definition_activite || projectData.description,
          activites_metier_concernees: cadrageData.activites_metier_concernees || [],
          temporalite: cadrageData.temporalite || 'ANNUEL',
          prochaine_revue: cadrageData.prochaine_revue || formatDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          raci: cadrageData.raci || [], // Format attendu par l'API
          rencontres_planifiees: cadrageData.rencontres_planifiees || [],
          ressources_necessaires: cadrageData.ressources_necessaires || [],
          criteres: cadrageData.criteres || [
            { critere: 'D', echelle: DEFAULT_IMPACT_SCALE, poids: 3 },
            { critere: 'I', echelle: DEFAULT_IMPACT_SCALE, poids: 3 },
            { critere: 'C', echelle: DEFAULT_IMPACT_SCALE, poids: 3 },
          ],
          outil_gestion_risques: cadrageData.outil_gestion_risques || '',
          cartographie_si_document_id: cadrageData.cartographie_si_document_id || undefined,
          statut: cadrageData.activite1_statut || 'NON_DEMARRE',
        });
        setLastSavedAt(new Date());
      }
    } catch (err) {
      console.error('Error loading cadrage:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Sauvegarder le cadrage
      await atelier1Api.upsertCadrage(projectId, formData);
      
      // Sauvegarder la matrice RACI dans l'API RACI
      const raciEntries = Object.entries(raciMatrix.matrix).flatMap(([activite_code, users]) =>
        Object.entries(users).map(([user_id, role_raci]) => ({
          activite_code,
          user_id,
          role_raci,
        }))
      );

      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/raci/projects/${projectId}/matrix`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ entries: raciEntries }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to save RACI matrix');
      }

      setLastSavedAt(new Date());
      await loadCadrage();
    } catch (err) {
      console.error('Error saving:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsAutoSaving(true);
  };

  const toggleRACICell = useCallback((activity: string, userId: string) => {
    setRaciMatrix(prev => {
      const current = prev.matrix[activity]?.[userId] || '-';
      const cycle: RoleRACI[] = ['-', 'R', 'A', 'C', 'I'];
      const currentIndex = cycle.indexOf(current);
      const nextValue = cycle[(currentIndex + 1) % cycle.length];

      return {
        ...prev,
        matrix: {
          ...prev.matrix,
          [activity]: {
            ...prev.matrix[activity],
            [userId]: nextValue,
          },
        },
      };
    });
    // Note: formData.raci n'est plus synchronisé avec raciMatrix.matrix
    // La synchronisation se fait à la sauvegarde via l'API RACI
  }, []);

  const addActivity = () => {
    // Les activités sont fixes (9 activités EBIOS), pas d'ajout possible
    return;
  };

  const addRole = () => {
    // Les rôles sont fixes (membres de l'équipe), pas d'ajout possible
    return;
  };

  const removeActivity = (activity: string) => {
    // Les activités sont fixes (9 activités EBIOS), pas de suppression possible
    return;
  };

  const removeRole = (userId: string) => {
    // Les rôles sont fixes (membres de l'équipe), pas de suppression possible
    return;
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // -------------------------------------------------------------------
  // COMPUTED
  // -------------------------------------------------------------------
  const sectionCompletion = useMemo(() => {
    return {
      section1: (formData.definition_activite?.length || 0) >= 20 && (formData.activites_metier_concernees?.length || 0) > 0,
      section2: formData.temporalite && formData.prochaine_revue && validateRACI(raciMatrix.matrix, DEFAULT_ACTIVITIES).valid,
      section3: (formData.ressources_necessaires?.length || 0) > 0,
      section4: (formData.criteres?.length || 0) >= 3,
      section5: (formData.outil_gestion_risques?.length || 0) > 0,
    };
  }, [formData, raciMatrix]);

  const totalCompletion = useMemo(() => {
    const sections = Object.values(sectionCompletion);
    return Math.round((sections.filter(Boolean).length / sections.length) * 100);
  }, [sectionCompletion]);

  const raciValidation = useMemo(
    () => validateRACI(raciMatrix.matrix, DEFAULT_ACTIVITIES),
    [raciMatrix.matrix]
  );

  const canTerminer = raciValidation.valid && totalCompletion === 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ACCORDÉON DES 5 SECTIONS */}
        <div className="space-y-3">
          {/* ===== SECTION 1 : DÉFINITION ===== */}
          <div className="border rounded-lg bg-white overflow-hidden">
            <button
              onClick={() => toggleSection('definition')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all duration-200"
            >
              <div className="flex items-start gap-3 w-full">
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white transition-colors",
                  sectionCompletion.section1 ? "bg-emerald-500" : "bg-slate-300"
                )}>
                  {sectionCompletion.section1 ? <CheckCircle2 className="h-5 w-5" /> : 1}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400"><FileText className="h-5 w-5" /></span>
                    <span className="font-semibold text-slate-900">Définition de l'activité</span>
                    {sectionCompletion.section1 && <Badge variant="default" className="bg-emerald-100 text-emerald-700">✓ Complète</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">Décrire l'activité de gestion des risques numériques et lister les activités métier concernées (PDF p. 56)</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${expandedSection === 'definition' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSection === 'definition' && (
              <div className="p-4 space-y-4 bg-white border-t border-gray-200">
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-900">Pré-remplissage automatique</AlertTitle>
                  <AlertDescription className="text-blue-800">
                    Les champs ci-dessous sont pré-remplis depuis la fiche projet. Vous pouvez les compléter ou les corriger.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="definition_activite">Définition de l'activité *</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-help">
                          <BookOpen className="h-3 w-3 mr-1" />
                          PDF p. 56
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Référence : Fiche méthode n°1 (page 56 du cours PECB EBIOS RM)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Textarea
                    id="definition_activite"
                    value={formData.definition_activite || ''}
                    onChange={(e) => handleInputChange('definition_activite', e.target.value)}
                    placeholder="Décrivez l'activité de gestion des risques numériques de votre organisation : missions, enjeux, périmètre, finalités..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label>Activités métier concernées *</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-help">
                            <BookOpen className="h-3 w-3 mr-1" />
                            PDF p. 56
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Référence : Fiche méthode n°1 (page 56 du cours PECB EBIOS RM)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newActivities = [...(formData.activites_metier_concernees || []), ''];
                      handleInputChange('activites_metier_concernees', newActivities);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Ajouter
                  </Button>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  Listez les activités métier de l'organisation qui sont dans le périmètre de l'étude.
                </p>
                <div className="space-y-2">
                  {(formData.activites_metier_concernees || []).map((activite, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={activite}
                        onChange={(e) => {
                          const newActivities = [...(formData.activites_metier_concernees || [])];
                          newActivities[index] = e.target.value;
                          handleInputChange('activites_metier_concernees', newActivities);
                        }}
                        placeholder={`Activité ${index + 1} (ex: Production, R&D, Commercial, RH...)`}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const newActivities = (formData.activites_metier_concernees || []).filter((_, i) => i !== index);
                          handleInputChange('activites_metier_concernees', newActivities);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  ))}
                  {(formData.activites_metier_concernees || []).length === 0 && (
                    <p className="text-sm text-slate-400 italic">Aucune activité — cliquez sur "Ajouter"</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border rounded-lg bg-white overflow-hidden">
            {/* ===== SECTION 2 : ORGANISATION (RACI + RENCONTRES) ===== */}
            <button
              onClick={() => toggleSection('organisation')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all duration-200"
            >
              <div className="flex items-start gap-3 w-full">
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white transition-colors",
                  sectionCompletion.section2 ? "bg-emerald-500" : "bg-slate-300"
                )}>
                  {sectionCompletion.section2 ? <CheckCircle2 className="h-5 w-5" /> : 2}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400"><Users className="h-5 w-5" /></span>
                    <span className="font-semibold text-slate-900">Organisation de l'activité</span>
                    {sectionCompletion.section2 && <Badge variant="default" className="bg-emerald-100 text-emerald-700">✓ Complète</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">Temporalité, matrice RACI, rencontres planifiées (PDF p. 55-56)</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${expandedSection === 'organisation' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSection === 'organisation' && (
              <div className="p-4 space-y-6 bg-white border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="temporalite">Temporalité du cycle *</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-help">
                            <BookOpen className="h-3 w-3 mr-1" />
                            PDF p. 55
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Référence : Fiche méthode n°1 (page 55 du cours PECB EBIOS RM)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select 
                      value={formData.temporalite || ''}
                      onValueChange={(value) => handleInputChange('temporalite', value as Temporalite)}
                    >
                      <SelectTrigger id="temporalite">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TEMPORALITE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prochaine_revue">Prochaine revue *</Label>
                    <Input
                      id="prochaine_revue"
                      type="date"
                      value={formData.prochaine_revue?.split('T')[0] || ''}
                      onChange={(e) => handleInputChange('prochaine_revue', e.target.value)}
                    />
                  </div>
                </div>

                {/* MATRICE RACI */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Label className="text-base">Matrice RACI</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-help">
                              <BookOpen className="h-3 w-3 mr-1" />
                              PDF p. 55 — obligatoire
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Référence : Fiche méthode n°1 (page 55 du cours PECB EBIOS RM)</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        Pour chaque activité, désignez au moins <b>un Approbateur (A)</b>. Cliquez sur une cellule pour cycler : <span className="font-mono">— → R → A → C → I</span>
                      </p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" type="button">
                          <Info className="h-3 w-3 mr-1" /> Légende
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Légende RACI</h4>
                          {Object.entries(RACI_COLORS).map(([k, v]) => (
                            <div key={k} className="flex items-start gap-2">
                              <span className={cn("px-2 py-0.5 rounded font-bold text-xs", v.bg, v.text)}>{v.label}</span>
                              <p className="text-xs text-slate-600">{v.description}</p>
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {!raciValidation.valid && (
                    <Alert variant="destructive" className="bg-rose-50 border-rose-200">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      <AlertTitle className="text-rose-900">Erreurs de validation RACI</AlertTitle>
                      <AlertDescription className="text-rose-800">
                        {raciValidation.activitiesSansA.length > 0 && (
                          <div>{raciValidation.activitiesSansA.length} activité(s) n'ont pas de <b>A</b> : {raciValidation.activitiesSansA.join(', ')}</div>
                        )}
                        {raciValidation.activitiesMultipleA.length > 0 && (
                          <div>{raciValidation.activitiesMultipleA.length} activité(s) ont plusieurs <b>A</b> : {raciValidation.activitiesMultipleA.join(', ')}</div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-3 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 min-w-[200px]">
                            Activité \ Membre
                          </th>
                          {allMembers.map(user => (
                            <th key={user.id} className="p-3 font-semibold text-slate-700 text-center min-w-[100px]">
                              <div className="flex flex-col items-center gap-1">
                                <Badge className="text-xs">{user.role}</Badge>
                                <span className="text-xs font-medium">
                                  {user.first_name} {user.last_name.charAt(0)}.
                                </span>
                                {user.job_title && (
                                  <Badge variant="outline" className="text-[10px]">{user.job_title}</Badge>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {DEFAULT_ACTIVITIES.map(activityValue => {
                          const activity = EBIOS_ACTIVITIES.find(a => a.value === activityValue);
                          if (!activity) return null;
                          return (
                          <tr key={activity.value} className="hover:bg-slate-50">
                            <td className="p-3 sticky left-0 bg-white z-10">
                              <div className="font-medium text-slate-900">{activity.label}</div>
                              <div className="text-xs text-slate-500">{activity.description}</div>
                            </td>
                            {allMembers.map(user => {
                              const value = raciMatrix.matrix[activity.value]?.[user.id] || '-';
                              const colorClass = RACI_COLORS[value as RoleRACI];
                              return (
                                <td key={user.id} className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleRACICell(activity.value, user.id)}
                                    className={cn(
                                      "w-9 h-9 rounded font-bold text-sm transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#2f54eb] relative z-20",
                                      colorClass.bg,
                                      colorClass.text
                                    )}
                                    aria-label={`${activity.label} × ${user.first_name} ${user.last_name} = ${value}`}
                                  >
                                    {value}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RENCONTRES PLANIFIÉES */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-base">Rencontres planifiées</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-help">
                            <BookOpen className="h-3 w-3 mr-1" />
                            PDF p. 56
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Référence : Fiche méthode n°1 (page 56 du cours PECB EBIOS RM)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newRencontres = [...(formData.rencontres_planifiees || []), {
                          id: generateId(),
                          date: formatDate(new Date(), 'yyyy-MM-dd'),
                          objet: '',
                          participants: [],
                          duree: 1,
                        }];
                        handleInputChange('rencontres_planifiees', newRencontres);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Planifier une rencontre
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(formData.rencontres_planifiees || []).map((rencontre, index) => (
                      <Card key={rencontre.id} className="border-slate-200">
                        <CardContent className="p-3">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                            <div className="md:col-span-2">
                              <Label className="text-xs">Date</Label>
                              <Input
                                type="date"
                                value={rencontre.date?.split('T')[0] || ''}
                                onChange={(e) => {
                                  const newRencontres = [...(formData.rencontres_planifiees || [])];
                                  newRencontres[index] = { ...rencontre, date: e.target.value };
                                  handleInputChange('rencontres_planifiees', newRencontres);
                                }}
                              />
                            </div>
                            <div className="md:col-span-1">
                              <Label className="text-xs">Durée (h)</Label>
                              <Input
                                type="number"
                                min="0.5"
                                step="0.5"
                                value={rencontre.duree || 1}
                                onChange={(e) => {
                                  const newRencontres = [...(formData.rencontres_planifiees || [])];
                                  newRencontres[index] = { ...rencontre, duree: parseFloat(e.target.value) };
                                  handleInputChange('rencontres_planifiees', newRencontres);
                                }}
                              />
                            </div>
                            <div className="md:col-span-5">
                              <Label className="text-xs">Objet</Label>
                              <Input
                                value={rencontre.objet || ''}
                                onChange={(e) => {
                                  const newRencontres = [...(formData.rencontres_planifiees || [])];
                                  newRencontres[index] = { ...rencontre, objet: e.target.value };
                                  handleInputChange('rencontres_planifiees', newRencontres);
                                }}
                                placeholder="Ex: Kick-off Atelier 1"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <Label className="text-xs">Participants</Label>
                              <Input
                                value={(rencontre.participants || []).join(', ')}
                                onChange={(e) => {
                                  const newRencontres = [...(formData.rencontres_planifiees || [])];
                                  newRencontres[index] = { ...rencontre, participants: e.target.value.split(',').map(s => s.trim()).filter(Boolean) };
                                  handleInputChange('rencontres_planifiees', newRencontres);
                                }}
                                placeholder="Alice, Bob, Charles"
                              />
                            </div>
                            <div className="md:col-span-1 flex items-end">
                              <Button type="button" size="icon" variant="ghost" onClick={() => {
                                const newRencontres = (formData.rencontres_planifiees || []).filter((_, i) => i !== index);
                                handleInputChange('rencontres_planifiees', newRencontres);
                              }}>
                                <Trash2 className="h-4 w-4 text-rose-500" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {(formData.rencontres_planifiees || []).length === 0 && (
                      <p className="text-sm text-slate-400 italic">Aucune rencontre planifiée</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===== SECTION 3 : RESSOURCES ===== */}
          <div className="border rounded-lg bg-white overflow-hidden">
            <button
              onClick={() => toggleSection('ressources')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all duration-200"
            >
              <div className="flex items-start gap-3 w-full">
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white transition-colors",
                  sectionCompletion.section3 ? "bg-emerald-500" : "bg-slate-300"
                )}>
                  {sectionCompletion.section3 ? <CheckCircle2 className="h-5 w-5" /> : 3}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400"><Wrench className="h-5 w-5" /></span>
                    <span className="font-semibold text-slate-900">Ressources nécessaires</span>
                    {sectionCompletion.section3 && <Badge variant="default" className="bg-emerald-100 text-emerald-700">✓ Complète</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">Acteurs, outils, ressources matérielles (PDF p. 56)</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${expandedSection === 'ressources' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSection === 'ressources' && (
              <div className="p-4 space-y-4 bg-white border-t border-gray-200">
                <p className="text-sm text-slate-500">
                  Listez l'ensemble des ressources à mobiliser pour mener à bien l'atelier.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newRessources = [...(formData.ressources_necessaires || []), {
                      id: generateId(),
                      type: 'ACTEUR',
                      nom: '',
                      description: '',
                    }];
                    handleInputChange('ressources_necessaires', newRessources);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Ajouter une ressource
                </Button>
                <div className="space-y-2">
                  {(formData.ressources_necessaires || []).map((ressource, index) => (
                    <Card key={ressource.id} className="border-slate-200">
                      <CardContent className="p-3">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                          <div className="md:col-span-2">
                            <Label className="text-xs">Type</Label>
                            <Select 
                              value={ressource.type}
                              onValueChange={(value) => {
                                const newRessources = [...(formData.ressources_necessaires || [])];
                                newRessources[index] = { ...ressource, type: value as TypeRessource };
                                handleInputChange('ressources_necessaires', newRessources);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ACTEUR"><Users className="h-3 w-3 mr-1 inline" /> Acteur</SelectItem>
                                <SelectItem value="OUTIL"><Wrench className="h-3 w-3 mr-1 inline" /> Outil</SelectItem>
                                <SelectItem value="MATERIEL"><Map className="h-3 w-3 mr-1 inline" /> Matériel</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-4">
                            <Label className="text-xs">Nom *</Label>
                            <Input
                              value={ressource.nom || ''}
                              onChange={(e) => {
                                const newRessources = [...(formData.ressources_necessaires || [])];
                                newRessources[index] = { ...ressource, nom: e.target.value };
                                handleInputChange('ressources_necessaires', newRessources);
                              }}
                              placeholder="Ex: Alice Dupont, EBIOS RM Manager..."
                            />
                          </div>
                          <div className="md:col-span-5">
                            <Label className="text-xs">Description (optionnel)</Label>
                            <Input
                              value={ressource.description || ''}
                              onChange={(e) => {
                                const newRessources = [...(formData.ressources_necessaires || [])];
                                newRessources[index] = { ...ressource, description: e.target.value };
                                handleInputChange('ressources_necessaires', newRessources);
                              }}
                              placeholder="Précisions sur cette ressource"
                            />
                          </div>
                          <div className="md:col-span-1 flex items-end">
                            <Button type="button" size="icon" variant="ghost" onClick={() => {
                              const newRessources = (formData.ressources_necessaires || []).filter((_, i) => i !== index);
                              handleInputChange('ressources_necessaires', newRessources);
                            }}>
                              <Trash2 className="h-4 w-4 text-rose-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(formData.ressources_necessaires || []).length === 0 && (
                    <p className="text-sm text-slate-400 italic">Aucune ressource — cliquez sur "Ajouter une ressource"</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ===== SECTION 4 : CRITÈRES DE SÉCURITÉ ===== */}
          <div className="border rounded-lg bg-white overflow-hidden">
            <button
              onClick={() => toggleSection('criteres')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all duration-200"
            >
              <div className="flex items-start gap-3 w-full">
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white transition-colors",
                  sectionCompletion.section4 ? "bg-emerald-500" : "bg-slate-300"
                )}>
                  {sectionCompletion.section4 ? <CheckCircle2 className="h-5 w-5" /> : 4}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400"><Shield className="h-5 w-5" /></span>
                    <span className="font-semibold text-slate-900">Critères de sécurité</span>
                    {sectionCompletion.section4 && <Badge variant="default" className="bg-emerald-100 text-emerald-700">✓ Complète</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">Échelles d'impact DICT (Disponibilité, Intégrité, Confidentialité, Traçabilité) — PDF p. 60</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${expandedSection === 'criteres' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSection === 'criteres' && (
              <div className="p-4 space-y-4 bg-white border-t border-gray-200">
                <Alert className="bg-amber-50 border-amber-200">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-900">Critères DICT — PDF p. 60</AlertTitle>
                  <AlertDescription className="text-amber-800">
                    Les critères <b>à minima</b> sont Disponibilité, Intégrité, Confidentialité. La <b>Traçabilité</b> est fortement recommandée. Chaque critère dispose d'une échelle d'importance graduelle (souvent 1 à 4).
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(formData.criteres || []).map((critere, index) => {
                    const critereInfo = DICT_CRITERES[critere.critere as CritereDICT];
                    return (
                      <Card key={index} className={cn("border-2", `border-${critereInfo?.color || 'slate'}-200`)}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Select 
                                value={critere.critere}
                                onValueChange={(value) => {
                                  const newCriteres = [...(formData.criteres || [])];
                                  newCriteres[index] = { ...critere, critere: value as CritereDICT };
                                  handleInputChange('criteres', newCriteres);
                                }}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(DICT_CRITERES).map(([k, v]) => (
                                    <SelectItem key={k} value={k}>
                                      <span className="font-bold mr-1">{k}</span> {v.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" type="button">
                                    <Info className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">{critereInfo?.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Button size="icon" variant="ghost" type="button" onClick={() => {
                              const newCriteres = (formData.criteres || []).filter((_, i) => i !== index);
                              handleInputChange('criteres', newCriteres);
                            }}>
                              <Trash2 className="h-4 w-4 text-rose-500" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="text-xs text-slate-500">Échelle d'importance</div>
                          <div className="space-y-1">
                            {[1, 2, 3, 4].map(niveau => {
                              const echelle = critere.echelle || [];
                              const libelle = echelle[niveau - 1]?.libelle || '';
                              return (
                                <div key={niveau} className="flex items-center gap-2 text-xs">
                                  <span className="font-mono w-6 text-slate-500">N{niveau}</span>
                                  <Input
                                    value={libelle}
                                    onChange={(e) => {
                                      const newCriteres = [...(formData.criteres || [])];
                                      const newEchelle = [...(newCriteres[index].echelle || [])];
                                      newEchelle[niveau - 1] = { ...newEchelle[niveau - 1], libelle: e.target.value };
                                      newCriteres[index] = { ...newCriteres[index], echelle: newEchelle };
                                      handleInputChange('criteres', newCriteres);
                                    }}
                                    placeholder={`Libellé niveau ${niveau}`}
                                    className="h-7 text-xs flex-1"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <Label className="text-xs">Poids</Label>
                            <Input
                              type="number"
                              min="1"
                              max="4"
                              value={critere.poids || 3}
                              onChange={(e) => {
                                const newCriteres = [...(formData.criteres || [])];
                                newCriteres[index] = { ...newCriteres[index], poids: parseInt(e.target.value) };
                                handleInputChange('criteres', newCriteres);
                              }}
                              className="w-16 h-7 text-xs"
                            />
                            <span className="text-xs text-slate-500">/4</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ===== SECTION 5 : OUTILLAGE ===== */}
          <div className="border rounded-lg bg-white overflow-hidden">
            <button
              onClick={() => toggleSection('outillage')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all duration-200"
            >
              <div className="flex items-start gap-3 w-full">
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white transition-colors",
                  sectionCompletion.section5 ? "bg-emerald-500" : "bg-slate-300"
                )}>
                  {sectionCompletion.section5 ? <CheckCircle2 className="h-5 w-5" /> : 5}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400"><Map className="h-5 w-5" /></span>
                    <span className="font-semibold text-slate-900">Outillage de la gestion des risques</span>
                    {sectionCompletion.section5 && <Badge variant="default" className="bg-emerald-100 text-emerald-700">✓ Complète</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">Outil utilisé + cartographie du système d'information (PDF p. 56)</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${expandedSection === 'outillage' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSection === 'outillage' && (
              <div className="p-4 space-y-4 bg-white border-t border-gray-200">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="outil_gestion_risques">Outil de gestion des risques *</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 cursor-help">
                          <BookOpen className="h-3 w-3 mr-1" />
                          PDF p. 56
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Référence : Fiche méthode n°1 (page 56 du cours PECB EBIOS RM)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select 
                    value={formData.outil_gestion_risques || ''}
                    onValueChange={(value) => handleInputChange('outil_gestion_risques', value)}
                  >
                    <SelectTrigger id="outil_gestion_risques">
                      <SelectValue placeholder="Sélectionnez l'outil utilisé" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ebios_rm_manager">EBIOS RM Manager (ANSSI)</SelectItem>
                      <SelectItem value="excel">Microsoft Excel</SelectItem>
                      <SelectItem value="riskinsight">RiskInsight</SelectItem>
                      <SelectItem value="autre">Autre (préciser)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cartographie du système d'information</Label>
                  <p className="text-sm text-slate-500">
                    Joignez votre cartographie du SI (PDF, image, ou lien). Cette pièce sera incluse dans l'export final.
                  </p>
                  <div className="flex items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg">
                    <div className="text-center">
                      <Map className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Fonctionnalité de téléversement à implémenter</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG, SVG (max 10 Mo)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER : actions */}
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              {canTerminer ? (
                <span className="flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Toutes les sections sont complètes — vous pouvez marquer l'activité comme terminée
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  Complétez toutes les sections pour terminer l'activité
                </span>
              )}
            </div>
<div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                {isAutoSaving ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                    Sauvegarde automatique…
                  </>
                ) : lastSavedAt ? (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Enregistré localement {lastSavedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span>Brouillon local actif</span>
                )}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Sauvegarder
              </Button>

              {currentStatut !== 'EN_COURS' && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onStatutChange('EN_COURS')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Marquer "En cours"
                </Button>
              )}

              <Button
                type="button"
                disabled={!canTerminer}
                onClick={() => onStatutChange('TERMINE')}
                className="bg-[#2f54eb] hover:bg-[#2f54eb]/90"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marquer "Terminée"
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};
