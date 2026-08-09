import { useState, useEffect } from 'react';
import { atelier1Api, EvenementRedoute, ValeurMetier, Gravite, ActiviteStatut } from '../../api/atelier1';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useEchelleGravite } from '../../hooks/useEchelleGravite';
import { DIC_CRITERES, CritereDIC } from '../../lib/dic';
import { IMPACT_CATEGORIES, ImpactCategorie, ImpactIntensite, INTENSITE_LABELS } from '../../lib/impacts';
import { ER_TEMPLATES, ERTemplate } from '../../lib/er-templates';
import { 
  AlertTriangle, 
  BarChart3, 
  Lightbulb, 
  Check, 
  Edit, 
  Trash2, 
  AlertCircle,
  Search,
  Filter,
  Plus,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface Activite3ViewProps {
  projectId: string;
  onStatutChange: (statut: ActiviteStatut) => void;
  currentStatut: ActiviteStatut;
}

type ViewMode = 'cards' | 'heatmap' | 'list';

export default function Activite3View({ projectId, onStatutChange, currentStatut }: Activite3ViewProps) {
  const [evenements, setEvenements] = useState<EvenementRedoute[]>([]);
  const [valeursMetier, setValeursMetier] = useState<ValeurMetier[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGravite, setFilterGravite] = useState<string>('all');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showCartographie, setShowCartographie] = useState(false);
  const [selectedEvenement, setSelectedEvenement] = useState<EvenementRedoute | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<Partial<EvenementRedoute>>({
    gravite: 'G1',
    gravite_surchargee: false,
    criteres_dic: [],
    statut: 'BROUILLON',
    validated_by_metier: false,
    validated_by_dg: false,
    impacts: Object.values(IMPACT_CATEGORIES).map(cat => ({
      categorie: cat.categorie,
      intensite: 0
    }))
  });
  
  // Validation form data
  const [validationData, setValidationData] = useState({
    validated_by_metier: false,
    validated_by_dg: false,
    commentaire_client: ''
  });
  
  // Cartographie data
  const [cartographie, setCartographie] = useState<{
    evenements_par_gravite: Record<string, EvenementRedoute[]>;
    valeurs_metier_par_gravite: Record<string, ValeurMetier[]>;
  } | null>(null);
  
  // Use the dynamic gravity scale hook
  const { echelle, niveaux, loading: echelleLoading, getCouleurByCode, getLibelleByCode } = useEchelleGravite(projectId);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [evenementsRes, valeursRes] = await Promise.all([
        atelier1Api.getEvenementsRedoutes(projectId),
        atelier1Api.getValeursMetier(projectId),
      ]);
      setEvenements(evenementsRes.data.evenements || []);
      setValeursMetier(valeursRes.data.valeurs_metier || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setEvenements([]);
      setValeursMetier([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCartographie = async () => {
    try {
      const response = await atelier1Api.getCartographieGravite(projectId);
      setCartographie(response.data);
      setShowCartographie(true);
    } catch (err) {
      console.error('Error loading cartographie:', err);
    }
  };

  const calculateGravite = (intensities: number[]) => {
    if (!intensities.length) return 'G1';
    const max = Math.max(...intensities);
    if (max === 0) return 'G1';
    if (max === 1) return 'G2';
    if (max === 2) return 'G3';
    if (max === 3) return 'G4';
    if (max === 4) return 'G5';
    return 'G1';
  };

  const calculatedGravite = formData.impacts 
    ? calculateGravite(formData.impacts.map(i => i.intensite))
    : 'G1';

  const handleCreateEvenement = async () => {
    try {
      const payload = {
        ...formData,
        gravite: formData.gravite_surchargee ? formData.gravite : calculatedGravite,
      };
      await atelier1Api.createEvenementRedoute(projectId, payload);
      setShowCreateModal(false);
      resetFormData();
      loadData();
    } catch (err) {
      console.error('Error creating evenement:', err);
    }
  };

  const handleUpdateEvenement = async () => {
    if (!selectedEvenement?.id) return;
    try {
      const payload = {
        ...formData,
        gravite: formData.gravite_surchargee ? formData.gravite : calculatedGravite,
      };
      await atelier1Api.updateEvenementRedoute(selectedEvenement.id, payload);
      setShowEditModal(false);
      setSelectedEvenement(null);
      resetFormData();
      loadData();
    } catch (err) {
      console.error('Error updating evenement:', err);
    }
  };

  const handleDeleteEvenement = async (evenementId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement redouté ?')) return;
    try {
      await atelier1Api.deleteEvenementRedoute(evenementId);
      loadData();
    } catch (err) {
      console.error('Error deleting evenement:', err);
    }
  };

  const handleValidateEvenement = async () => {
    if (!selectedEvenement?.id) return;
    try {
      await atelier1Api.validateEvenementRedoute(selectedEvenement.id, validationData);
      setShowValidationModal(false);
      setSelectedEvenement(null);
      setValidationData({ validated_by_metier: false, validated_by_dg: false, commentaire_client: '' });
      loadData();
    } catch (err) {
      console.error('Error validating evenement:', err);
    }
  };

  const resetFormData = () => {
    setFormData({
      gravite: 'G1',
      gravite_surchargee: false,
      criteres_dic: [],
      statut: 'BROUILLON',
      validated_by_metier: false,
      validated_by_dg: false,
      impacts: Object.values(IMPACT_CATEGORIES).map(cat => ({
        categorie: cat.categorie,
        intensite: 0
      }))
    });
  };

  const openEditModal = (evenement: EvenementRedoute) => {
    setSelectedEvenement(evenement);
    setFormData({
      ...evenement,
      impacts: evenement.impacts || Object.values(IMPACT_CATEGORIES).map(cat => ({
        categorie: cat.categorie,
        intensite: 0
      }))
    });
    setShowEditModal(true);
  };

  const openValidationModal = (evenement: EvenementRedoute) => {
    setSelectedEvenement(evenement);
    setValidationData({
      validated_by_metier: evenement.validated_by_metier || false,
      validated_by_dg: evenement.validated_by_dg || false,
      commentaire_client: evenement.commentaire_client || ''
    });
    setShowValidationModal(true);
  };

  const applyTemplate = (template: ERTemplate) => {
    setFormData({
      ...formData,
      nom: template.nom,
      description: template.description,
      criteres_dic: template.dic,
      impacts: Object.values(IMPACT_CATEGORIES).map(cat => ({
        categorie: cat.categorie,
        intensite: template.impacts?.[cat.categorie] || 0
      }))
    });
  };

  // Filter and search logic
  const filteredEvenements = evenements.filter(evenement => {
    const matchesSearch = evenement.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (evenement.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGravite = filterGravite === 'all' || evenement.gravite === filterGravite;
    const matchesStatut = filterStatut === 'all' || evenement.statut === filterStatut;
    return matchesSearch && matchesGravite && matchesStatut;
  });

  // Group evenements by valeur métier
  const evenementsByVM = filteredEvenements.reduce((acc, evenement) => {
    const vm = valeursMetier.find(v => v.id === evenement.valeur_metier_id);
    const vmName = vm?.nom || 'Inconnu';
    if (!acc[vmName]) {
      acc[vmName] = [];
    }
    acc[vmName].push(evenement);
    return acc;
  }, {} as Record<string, EvenementRedoute[]>);

  // Calculate completion stats
  const totalEvenements = evenements.length;
  const validatedEvenements = evenements.filter(e => e.validated_by_dg).length;
  const completionPercent = totalEvenements > 0 ? Math.round((validatedEvenements / totalEvenements) * 100) : 0;

  // G4/G5 non validés
  const g45NonValides = evenements.filter(e => 
    (e.gravite === 'G4' || e.gravite === 'G5') && !e.validated_by_dg
  );

  // Heatmap data
  const heatmapData = Object.entries(evenementsByVM).reduce((acc, [vmName, evts]) => {
    acc[vmName] = { D: null, I: null, C: null };
    evts.forEach(evt => {
      (evt.criteres_dic || []).forEach(dic => {
        if (!acc[vmName][dic as keyof typeof acc[typeof vmName]] || 
            evt.gravite > acc[vmName][dic as keyof typeof acc[typeof vmName]]) {
          acc[vmName][dic as keyof typeof acc[typeof vmName]] = evt.gravite;
        }
      });
    });
    return acc;
  }, {} as Record<string, Record<string, string | null>>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Gravity Scale Banner */}
      <Alert className="bg-purple-50 border-purple-200">
        <BarChart3 className="h-4 w-4 text-purple-600" />
        <AlertTitle className="text-purple-900">Échelle de gravité active</AlertTitle>
        <AlertDescription className="text-purple-800 flex items-center gap-2 flex-wrap mt-1">
          {niveaux.map(n => (
            <span key={n.code} className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: n.couleur }}>
              {n.code} {n.libelle}
            </span>
          ))}
          <span className="text-xs italic text-purple-700">
            · {echelle?.source === 'STANDARD_EBIOS' ? 'Échelle standard ANSSI' : 'Échelle importée client'}
          </span>
        </AlertDescription>
      </Alert>

      {/* G4/G5 Validation Alert */}
      {g45NonValides.length > 0 && (
        <Alert className="bg-rose-50 border-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <AlertTitle className="text-rose-900">Validation Direction Générale requise (PDF p. 67)</AlertTitle>
          <AlertDescription className="text-rose-800">
            <b>{g45NonValides.length} ER de gravité G4/G5</b> en attente de validation par la DG.
            Conformément au PDF : <i>« La seconde phase de validation des risques de gravité de niveau 4 devrait être confirmée par la direction générale. »</i>
          </AlertDescription>
        </Alert>
      )}

      {/* Educational Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <Lightbulb className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Méthode d'identification des ER (PDF p. 60)</AlertTitle>
        <AlertDescription className="text-blue-800">
          Pour chaque VM, recherchez les effets néfastes consécutifs à une atteinte à la <b>Disponibilité</b>, à l'<b>Intégrité</b> ou à la <b>Confidentialité</b>. Évaluez ensuite la gravité via les 8 catégories d'impacts.
        </AlertDescription>
      </Alert>

      {/* Global Cartography Bar Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Cartographie globale des ER par gravité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {niveaux.map(n => {
              const count = cartographie?.evenements_par_gravite[n.code as Gravite]?.length || 0;
              const max = Math.max(...Object.values(cartographie?.evenements_par_gravite || {}), 1);
              const height = count > 0 ? (count / max) * 100 : 2;
              return (
                <div key={n.code} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs font-bold">{count}</div>
                  <div 
                    className="w-full rounded-t transition-all" 
                    style={{ 
                      height: `${height}%`, 
                      backgroundColor: n.couleur, 
                      opacity: count > 0 ? 1 : 0.2 
                    }} 
                  />
                  <div className="text-xs font-semibold">{n.code}</div>
                  <div className="text-[10px] text-slate-500 text-center">{n.libelle}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={filterGravite} onValueChange={setFilterGravite}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Gravité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {niveaux.map(n => (
                <SelectItem key={n.code} value={n.code}>{n.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="BROUILLON">Brouillon</SelectItem>
              <SelectItem value="VALIDE_METIER">Validé Métier</SelectItem>
              <SelectItem value="VALIDE_FINAL">Validé Final</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-1">
            {(['cards', 'heatmap', 'list'] as ViewMode[]).map(mode => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(mode)}
                className="capitalize"
              >
                {mode}
              </Button>
            ))}
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nouvel ER
          </Button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'cards' && (
        <div className="space-y-6">
          {Object.entries(evenementsByVM).map(([vmName, evts]) => (
            <div key={vmName}>
              <h4 className="font-semibold text-slate-900 mb-3">{vmName}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evts.map(evenement => (
                  <EvenementCard
                    key={evenement.id}
                    evenement={evenement}
                    onEdit={() => openEditModal(evenement)}
                    onValidate={() => openValidationModal(evenement)}
                    onDelete={() => handleDeleteEvenement(evenement.id!)}
                    getCouleurByCode={getCouleurByCode}
                    getLibelleByCode={getLibelleByCode}
                  />
                ))}
              </div>
            </div>
          ))}
          {Object.keys(evenementsByVM).length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Aucun événement redouté défini</p>
              <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                Créer le premier événement
              </Button>
            </div>
          )}
        </div>
      )}

      {viewMode === 'heatmap' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Heatmap VM × Critère DIC</CardTitle>
            <CardDescription>Gravité maximale par combinaison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-xs">Valeur métier</th>
                    {(['D', 'I', 'C'] as CritereDIC[]).map(c => (
                      <th key={c} className="p-2 text-center text-xs">{DIC_CRITERES[c].fullName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(heatmapData).map(vmName => (
                    <tr key={vmName} className="border-t">
                      <td className="p-2 font-medium">{vmName}</td>
                      {(['D', 'I', 'C'] as CritereDIC[]).map(c => {
                        const g = heatmapData[vmName]?.[c];
                        return (
                          <td key={c} className="p-1 text-center">
                            {g ? (
                              <span
                                className="inline-block w-12 h-9 rounded font-bold text-white text-xs shadow-sm"
                                style={{ backgroundColor: getCouleurByCode(g) }}
                              >
                                {g}
                              </span>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nom</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">VM</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">DIC</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Gravité</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Validation</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEvenements.map(evenement => {
                  const vm = valeursMetier.find(v => v.id === evenement.valeur_metier_id);
                  return (
                    <tr key={evenement.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{evenement.nom}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{vm?.nom || 'Inconnu'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {(evenement.criteres_dic || []).map(c => (
                            <span key={c} className={cn("text-xs px-2 py-0.5 rounded font-bold border", DIC_CRITERES[c as CritereDIC].bgClass, DIC_CRITERES[c as CritereDIC].textClass, DIC_CRITERES[c as CritereDIC].borderClass)}>
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold text-white`} style={{ backgroundColor: getCouleurByCode(evenement.gravite) }}>
                          {evenement.gravite}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs">
                          <span className={cn("px-2 py-0.5 rounded", evenement.validated_by_metier ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                            {evenement.validated_by_metier ? "✓" : "○"} M
                          </span>
                          <span className={cn("px-2 py-0.5 rounded", evenement.validated_by_dg ? "bg-emerald-100 text-emerald-700" : (evenement.gravite === 'G4' || evenement.gravite === 'G5') ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500")}>
                            {evenement.validated_by_dg ? "✓" : (evenement.gravite === 'G4' || evenement.gravite === 'G5') ? "!" : "○"} DG
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditModal(evenement)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openValidationModal(evenement)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteEvenement(evenement.id!)}>
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-slate-600">
          {validatedEvenements === totalEvenements && totalEvenements > 0 ? (
            <span className="text-emerald-600">✓ Tous validés</span>
          ) : (
            <span className="text-slate-500">{validatedEvenements}/{totalEvenements} validés</span>
          )}
        </div>
        <Button
          onClick={() => onStatutChange(currentStatut === 'TERMINE' ? 'EN_COURS' : 'TERMINE')}
          variant={currentStatut === 'TERMINE' ? 'outline' : 'default'}
          disabled={validatedEvenements !== totalEvenements}
        >
          {currentStatut === 'TERMINE' ? 'Marquer comme en cours' : 'Marquer comme terminé'}
        </Button>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal || showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedEvenement(null);
          resetFormData();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showEditModal ? 'Modifier' : 'Créer'} un événement redouté</DialogTitle>
            <DialogDescription>
              {showEditModal ? 'Modifiez les détails de l\'événement redouté.' : 'Créez un nouvel événement redouté en suivant la méthode EBIOS RM.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Templates */}
            {!showEditModal && (
              <div className="space-y-2">
                <Label>Templates suggérés</Label>
                <div className="flex flex-wrap gap-2">
                  {ER_TEMPLATES.map(template => (
                    <Button
                      key={template.nom}
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(template)}
                    >
                      {template.nom}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Basic fields */}
            <div>
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                value={formData.nom || ''}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="valeur_metier_id">Valeur métier associée *</Label>
              <Select 
                value={formData.valeur_metier_id} 
                onValueChange={(value) => setFormData({ ...formData, valeur_metier_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une valeur métier" />
                </SelectTrigger>
                <SelectContent>
                  {valeursMetier.map(vm => (
                    <SelectItem key={vm.id} value={vm.id!}>{vm.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* DIC Criteria */}
            <div>
              <Label className="font-medium">Critères DIC touchés</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(['D', 'I', 'C'] as CritereDIC[]).map(c => {
                  const checked = (formData.criteres_dic || []).includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          criteres_dic: checked
                            ? (formData.criteres_dic || []).filter(x => x !== c)
                            : [...(formData.criteres_dic || []), c]
                        });
                      }}
                      className={cn("p-3 border-2 rounded-lg text-left transition-all", checked ? `${DIC_CRITERES[c].borderClass} ${DIC_CRITERES[c].bgClass}` : "border-slate-200 hover:border-slate-300")}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("w-7 h-7 rounded font-bold flex items-center justify-center text-sm", checked ? `${DIC_CRITERES[c].textClass} bg-white border ${DIC_CRITERES[c].borderClass}` : "bg-slate-100 text-slate-400")}>
                          {c}
                        </span>
                        <span className="font-semibold text-sm">{DIC_CRITERES[c].fullName}</span>
                        {checked && <Check className="h-4 w-4 text-emerald-600 ml-auto" />}
                      </div>
                      <p className="text-xs text-slate-500">{DIC_CRITERES[c].description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Impact Categories */}
            <div>
              <Label className="font-medium">Catégories d'impacts (PDF p. 62)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {(formData.impacts || []).map((imp, i) => {
                  const info = IMPACT_CATEGORIES[imp.categorie as ImpactCategorie];
                  return (
                    <div key={imp.categorie} className="flex items-center gap-2 p-2 border rounded">
                      <span className="text-lg">{info.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold">{info.label}</div>
                        <div className="flex gap-1 mt-1">
                          {[0, 1, 2, 3, 4].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => {
                                const newImpacts = [...(formData.impacts || [])];
                                newImpacts[i] = { ...imp, intensite: n as ImpactIntensite };
                                setFormData({ ...formData, impacts: newImpacts });
                              }}
                              className={cn("w-6 h-6 rounded text-xs font-bold", imp.intensite === n ? "bg-[#8B1538] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calculated Gravity */}
            <div className="bg-blue-50 p-3 rounded">
              <Label>Gravité calculée: </Label>
              <span className={`ml-2 px-2 py-1 rounded text-xs font-bold text-white`} style={{ backgroundColor: getCouleurByCode(calculatedGravite) }}>
                {calculatedGravite} - {getLibelleByCode(calculatedGravite)}
              </span>
            </div>

            {/* Surcharge */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="gravite_surchargee"
                checked={formData.gravite_surchargee}
                onChange={(e) => setFormData({ ...formData, gravite_surchargee: e.target.checked })}
              />
              <Label htmlFor="gravite_surchargee">Surcharger la gravité</Label>
            </div>

            {formData.gravite_surchargee && (
              <>
                <div>
                  <Label>Gravité personnalisée</Label>
                  <Select
                    value={formData.gravite}
                    onValueChange={(value) => setFormData({ ...formData, gravite: value as Gravite })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {niveaux.map(niveau => (
                        <SelectItem key={niveau.code} value={niveau.code}>
                          {niveau.code} - {niveau.libelle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="justification">Justification *</Label>
                  <Textarea
                    id="justification"
                    value={formData.justification || ''}
                    onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                    rows={2}
                    placeholder="Expliquez pourquoi vous surchargez la gravité..."
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setSelectedEvenement(null);
              resetFormData();
            }}>
              Annuler
            </Button>
            <Button onClick={showEditModal ? handleUpdateEvenement : handleCreateEvenement} className="bg-[#8B1538]">
              {showEditModal ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Modal */}
      <Dialog open={showValidationModal} onOpenChange={(open) => {
        if (!open) {
          setShowValidationModal(false);
          setSelectedEvenement(null);
          setValidationData({ validated_by_metier: false, validated_by_dg: false, commentaire_client: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validation 2-phases — {selectedEvenement?.nom}</DialogTitle>
            <DialogDescription>
              Conforme PDF p. 67 : <i>« La première validation est réalisée par les responsables métier [...] La seconde phase de validation des risques de gravité de niveau 4 devrait être confirmée par la direction générale. »</i>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEvenement && (
              <>
                <div className="p-3 rounded border-2 border-rose-200 bg-rose-50">
                  <div className="text-xs text-rose-600 font-semibold">Gravité</div>
                  <div className="text-3xl font-bold text-rose-700">{selectedEvenement.gravite}</div>
                  {(selectedEvenement.gravite === 'G4' || selectedEvenement.gravite === 'G5') && (
                    <p className="text-xs text-rose-700 mt-1">⚠ Validation DG obligatoire</p>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-semibold text-sm">Phase 1 — Responsable métier</div>
                    <div className="text-xs text-slate-500">Propriétaire du risque</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={validationData.validated_by_metier}
                    onChange={(e) => setValidationData({ ...validationData, validated_by_metier: e.target.checked })}
                    className="w-5 h-5"
                  />
                </div>
                <div className={cn("flex items-center justify-between p-3 border rounded", (selectedEvenement.gravite === 'G4' || selectedEvenement.gravite === 'G5') && "border-rose-300 bg-rose-50/30")}>
                  <div>
                    <div className="font-semibold text-sm">
                      Phase 2 — Direction Générale
                      {(selectedEvenement.gravite === 'G4' || selectedEvenement.gravite === 'G5') && (
                        <Badge variant="destructive" className="ml-1 text-[10px]">Requis si G4/G5</Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">Décision finale sur les ER critiques</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={validationData.validated_by_dg}
                    onChange={(e) => setValidationData({ ...validationData, validated_by_dg: e.target.checked })}
                    className="w-5 h-5"
                  />
                </div>
                <div>
                  <Label className="text-xs">Commentaire (optionnel)</Label>
                  <Textarea
                    value={validationData.commentaire_client}
                    onChange={(e) => setValidationData({ ...validationData, commentaire_client: e.target.value })}
                    placeholder="Précisions..."
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowValidationModal(false);
              setSelectedEvenement(null);
              setValidationData({ validated_by_metier: false, validated_by_dg: false, commentaire_client: '' });
            }}>
              Annuler
            </Button>
            <Button
              onClick={handleValidateEvenement}
              disabled={selectedEvenement && (selectedEvenement.gravite === 'G4' || selectedEvenement.gravite === 'G5') && !validationData.validated_by_dg}
              className="bg-[#8B1538]"
            >
              <Check className="h-4 w-4 mr-2" /> Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Event Card Component
function EvenementCard({ 
  evenement, 
  onEdit, 
  onValidate, 
  onDelete, 
  getCouleurByCode, 
  getLibelleByCode 
}: { 
  evenement: EvenementRedoute; 
  onEdit: () => void; 
  onValidate: () => void; 
  onDelete: () => void; 
  getCouleurByCode: (code: string) => string; 
  getLibelleByCode: (code: string) => string; 
}) {
  const isG45 = evenement.gravite === 'G4' || evenement.gravite === 'G5';
  
  return (
    <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: getCouleurByCode(evenement.gravite) }}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Badge gravité */}
          <div className="flex-shrink-0">
            <span className={`px-3 py-1 rounded text-xs font-bold text-white`} style={{ backgroundColor: getCouleurByCode(evenement.gravite) }}>
              {evenement.gravite}
            </span>
            <div className="text-[10px] text-slate-500 mt-1 text-center">{getLibelleByCode(evenement.gravite)}</div>
            {evenement.gravite_surchargee && (
              <Badge variant="outline" className="mt-1 text-[10px] border-amber-300 text-amber-700">
                ⚠ Surchargé
              </Badge>
            )}
          </div>
          
          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-900">{evenement.nom}</h4>
            {evenement.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{evenement.description}</p>
            )}
            
            {/* DIC touchés */}
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {(evenement.criteres_dic || []).map(c => (
                <span key={c} className={cn("text-xs px-2 py-0.5 rounded font-bold border", DIC_CRITERES[c as CritereDIC].bgClass, DIC_CRITERES[c as CritereDIC].textClass, DIC_CRITERES[c as CritereDIC].borderClass)}>
                  {c}
                </span>
              ))}
            </div>
            
            {/* Impacts */}
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {(evenement.impacts || []).filter(i => i.intensite > 0).map(i => {
                const info = IMPACT_CATEGORIES[i.categorie as ImpactCategorie];
                return (
                  <span key={i.categorie} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border" title={info.label}>
                    {info.icon} {info.label.split(' ')[0]} <b>{i.intensite}</b>
                  </span>
                );
              })}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col gap-1">
            <Button size="icon" variant="ghost" onClick={onValidate} title="Valider">
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-rose-500" />
            </Button>
          </div>
        </div>
        
        {/* Validation 2-phases */}
        <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs">
          <div className={cn("px-2 py-0.5 rounded", evenement.validated_by_metier ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
            {evenement.validated_by_metier ? "✓" : "○"} Métier
          </div>
          <div className={cn("px-2 py-0.5 rounded", evenement.validated_by_dg ? "bg-emerald-100 text-emerald-700" : isG45 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500")}>
            {evenement.validated_by_dg ? "✓" : isG45 ? "!" : "○"} DG {isG45 && !evenement.validated_by_dg && "(requis)"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
