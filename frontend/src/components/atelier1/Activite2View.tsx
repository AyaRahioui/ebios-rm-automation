import { useState, useEffect } from 'react';
import { atelier1Api, ValeurMetier, BienSupport, ActiviteStatut } from '../../api/atelier1';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Textarea } from '../ui/textarea';
import { 
  Search, Filter, Plus, ChevronDown, ChevronRight, 
  Edit, Copy, Trash2, Lightbulb, Briefcase, Database, Clock, 
  CheckCircle2, AlertTriangle, X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { CritereDIC, NiveauBesoin, DIC_CRITERES, NIVEAUX_BESOIN, getIntensiteClass } from '../../lib/dic';
import { BSType, BS_TYPES, BSTYPE_OPTIONS } from '../../lib/bs-types';
import { VM_TEMPLATES, createVMFromTemplate, VMTemplate } from '../../lib/vm-templates';
import { useMyRaciRole } from '../../hooks/useRaciPermission';

interface Activite2ViewProps {
  projectId: string;
  onStatutChange: (statut: ActiviteStatut) => void;
  currentStatut: ActiviteStatut;
}

type SortBy = 'nom' | 'D' | 'I' | 'C' | 'bsCount';

export default function Activite2View({ projectId, onStatutChange, currentStatut }: Activite2ViewProps) {
  const [valeurs, setValeurs] = useState<ValeurMetier[]>([]);
  const [biensSupports, setBiensSupports] = useState<Record<string, BienSupport[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('nom');
  const [expandedValeur, setExpandedValeur] = useState<string | null>(null);
  
  // Filters
  const [filterDMin, setFilterDMin] = useState(0);
  const [filterIMin, setFilterIMin] = useState(0);
  const [filterCMin, setFilterCMin] = useState(0);
  const [filterBSMin, setFilterBSMin] = useState(0);
  const [filterCompleteOnly, setFilterCompleteOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Modals
  const [showCreateVM, setShowCreateVM] = useState(false);
  const [showCreateBS, setShowCreateBS] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedValeurForBS, setSelectedValeurForBS] = useState<string | null>(null);
  const [editingValeur, setEditingValeur] = useState<ValeurMetier | null>(null);
  
  // Form data
  const [newValeur, setNewValeur] = useState<Partial<ValeurMetier>>({
    besoin_disponibilite: 1,
    besoin_integrite: 1,
    besoin_confidentialite: 1,
  });
  const [newBienSupport, setNewBienSupport] = useState<Partial<BienSupport>>({
    type: 'MATERIEL',
  });

  // RACI permissions for A1.2
  const { data: raciPerm } = useMyRaciRole(projectId, 'A1.2');

  useEffect(() => {
    loadValeurs();
  }, [projectId]);

  const loadValeurs = async () => {
    try {
      setLoading(true);
      const response = await atelier1Api.getValeursMetier(projectId);
      const vms = response.data.valeurs_metier;
      setValeurs(vms);

      // Preload all biens supports in parallel so BS counts display immediately
      // without requiring the user to click on a VM first.
      const results = await Promise.all(
        vms.map(async (vm) => {
          try {
            const bsResponse = await atelier1Api.getBiensSupports(vm.id!);
            return { [vm.id!]: bsResponse.data.biens_supports };
          } catch (err) {
            console.error(`Error loading biens supports for "${vm.nom}":`, err);
            return { [vm.id!]: [] };
          }
        })
      );

      setBiensSupports(Object.assign({}, ...results));
    } catch (err) {
      console.error('Error loading valeurs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBiensSupports = async (valeurId: string) => {
    try {
      const response = await atelier1Api.getBiensSupports(valeurId);
      setBiensSupports(prev => ({ ...prev, [valeurId]: response.data.biens_supports }));
    } catch (err) {
      console.error('Error loading biens supports:', err);
    }
  };

  const isVMComplete = (vm: ValeurMetier, bsCount: number): boolean => {
    return !!(
      vm.besoin_disponibilite &&
      vm.besoin_integrite &&
      vm.besoin_confidentialite &&
      bsCount > 0
    );
  };

  const getCompletionStats = () => {
    const total = valeurs.length;
    const complete = valeurs.filter(vm => isVMComplete(vm, biensSupports[vm.id!]?.length || 0)).length;
    const percent = total > 0 ? Math.round((complete / total) * 100) : 0;
    return { total, complete, percent };
  };

  const completionStats = getCompletionStats();
  const canTerminer = completionStats.total > 0 && completionStats.complete === completionStats.total;

  const filteredAndSortedValeurs = valeurs
    .filter(vm => {
      const bsCount = biensSupports[vm.id!]?.length || 0;
      const matchesSearch = vm.nom.toLowerCase().includes(search.toLowerCase()) ||
                          (vm.description?.toLowerCase().includes(search.toLowerCase()));
      const matchesFilters = 
        vm.besoin_disponibilite >= filterDMin &&
        vm.besoin_integrite >= filterIMin &&
        vm.besoin_confidentialite >= filterCMin &&
        bsCount >= filterBSMin;
      const matchesComplete = !filterCompleteOnly || isVMComplete(vm, bsCount);
      return matchesSearch && matchesFilters && matchesComplete;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'nom':
          return a.nom.localeCompare(b.nom);
        case 'D':
          return b.besoin_disponibilite - a.besoin_disponibilite;
        case 'I':
          return b.besoin_integrite - a.besoin_integrite;
        case 'C':
          return b.besoin_confidentialite - a.besoin_confidentialite;
        case 'bsCount':
          return (biensSupports[b.id!]?.length || 0) - (biensSupports[a.id!]?.length || 0);
        default:
          return 0;
      }
    });

  const hasActiveFilters = filterDMin > 0 || filterIMin > 0 || filterCMin > 0 || filterBSMin > 0 || filterCompleteOnly;

  const handleCreateValeur = async () => {
    if (!newValeur.nom || newValeur.nom.trim() === '') {
      alert('Le nom de la valeur métier est requis');
      return;
    }
    
    const valeurData = {
      project_id: projectId,
      nom: newValeur.nom.trim(),
      description: newValeur.description?.trim() || undefined,
      activite_metier_associee: newValeur.activite_metier_associee?.trim() || undefined,
      besoin_disponibilite: Number(newValeur.besoin_disponibilite) || 1,
      besoin_integrite: Number(newValeur.besoin_integrite) || 1,
      besoin_confidentialite: Number(newValeur.besoin_confidentialite) || 1,
    };
    
    console.log('Sending valeur data:', valeurData);
    
    try {
      await atelier1Api.createValeurMetier(projectId, valeurData);
      setShowCreateVM(false);
      setNewValeur({ besoin_disponibilite: 1, besoin_integrite: 1, besoin_confidentialite: 1 });
      loadValeurs();
    } catch (err: any) {
      console.error('Error creating valeur:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Erreur lors de la création de la valeur métier';
      alert('Erreur: ' + errorMessage);
    }
  };

  const handleUpdateValeur = async () => {
    if (!editingValeur?.id) return;
    
    if (!newValeur.nom || newValeur.nom.trim() === '') {
      alert('Le nom de la valeur métier est requis');
      return;
    }
    
    const valeurData = {
      nom: newValeur.nom.trim(),
      description: newValeur.description?.trim() || undefined,
      activite_metier_associee: newValeur.activite_metier_associee?.trim() || undefined,
      besoin_disponibilite: newValeur.besoin_disponibilite || 1,
      besoin_integrite: newValeur.besoin_integrite || 1,
      besoin_confidentialite: newValeur.besoin_confidentialite || 1,
    };
    
    try {
      await atelier1Api.updateValeurMetier(editingValeur.id, valeurData);
      setShowCreateVM(false);
      setEditingValeur(null);
      setNewValeur({ besoin_disponibilite: 1, besoin_integrite: 1, besoin_confidentialite: 1 });
      loadValeurs();
    } catch (err) {
      console.error('Error updating valeur:', err);
      alert('Erreur lors de la modification de la valeur métier');
    }
  };

  const handleDeleteValeur = async (valeurId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette valeur métier ?')) return;
    try {
      await atelier1Api.deleteValeurMetier(valeurId);
      loadValeurs();
    } catch (err) {
      console.error('Error deleting valeur:', err);
    }
  };

  const handleDuplicateValeur = async (vm: ValeurMetier) => {
    const duplicated: Partial<ValeurMetier> = {
      project_id: projectId,
      nom: `${vm.nom} (copie)`,
      description: vm.description,
      activite_metier_associee: vm.activite_metier_associee,
      besoin_disponibilite: vm.besoin_disponibilite,
      besoin_integrite: vm.besoin_integrite,
      besoin_confidentialite: vm.besoin_confidentialite,
    };
    
    console.log('Sending duplicated valeur data:', duplicated);
    
    try {
      await atelier1Api.createValeurMetier(projectId, duplicated);
      loadValeurs();
    } catch (err: any) {
      console.error('Error duplicating valeur:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Erreur lors de la duplication de la valeur métier';
      alert('Erreur: ' + errorMessage);
    }
  };

  const handleCreateBienSupport = async () => {
    if (!selectedValeurForBS) return;
    if (!newBienSupport.nom || newBienSupport.nom.trim() === '') {
      alert('Le nom du bien support est requis');
      return;
    }
    if (!newBienSupport.type) {
      alert('Le type du bien support est requis');
      return;
    }
    
    const bienData = {
      nom: newBienSupport.nom.trim(),
      type: newBienSupport.type,
      description: newBienSupport.description?.trim() || undefined,
    };
    
    console.log('Sending bien support data:', bienData);
    
    try {
      await atelier1Api.createBienSupport(selectedValeurForBS, bienData);
      setShowCreateBS(false);
      setSelectedValeurForBS(null);
      setNewBienSupport({ type: 'MATERIEL' });
      loadBiensSupports(selectedValeurForBS);
    } catch (err: any) {
      console.error('Error creating bien support:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Erreur lors de la création du bien support';
      alert('Erreur: ' + errorMessage);
    }
  };

  const handleDeleteBienSupport = async (bienId: string, valeurId: string) => {
    try {
      await atelier1Api.deleteBienSupport(bienId);
      loadBiensSupports(valeurId);
    } catch (err) {
      console.error('Error deleting bien support:', err);
    }
  };

  const handleToggleExpand = async (valeurId: string) => {
    if (expandedValeur === valeurId) {
      setExpandedValeur(null);
    } else {
      setExpandedValeur(valeurId);
      if (!biensSupports[valeurId]) {
        await loadBiensSupports(valeurId);
      }
    }
  };

  const handleEditValeur = (vm: ValeurMetier) => {
    setEditingValeur(vm);
    setNewValeur({
      nom: vm.nom,
      description: vm.description,
      activite_metier_associee: vm.activite_metier_associee,
      besoin_disponibilite: vm.besoin_disponibilite,
      besoin_integrite: vm.besoin_integrite,
      besoin_confidentialite: vm.besoin_confidentialite,
    });
    setShowCreateVM(true);
  };

  const handleUseTemplate = (template: VMTemplate) => {
    const vmFromTemplate = createVMFromTemplate(template, projectId);
    setNewValeur(vmFromTemplate);
    setShowTemplates(false);
    setShowCreateVM(true);
  };

  const resetFilters = () => {
    setFilterDMin(0);
    setFilterIMin(0);
    setFilterCMin(0);
    setFilterBSMin(0);
    setFilterCompleteOnly(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* RACI Permission Alert */}
      {raciPerm && (
        <Alert className={cn(
          raciPerm.user_role === 'A' ? 'bg-emerald-50 border-emerald-200' :
          raciPerm.user_role === 'R' ? 'bg-blue-50 border-blue-200' :
          raciPerm.user_role === 'C' || raciPerm.user_role === 'I' ? 'bg-slate-50' :
          'bg-rose-50 border-rose-200'
        )}>
          {raciPerm.user_role === 'A' && (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-emerald-900">Autorité (A)</AlertTitle>
              <AlertDescription className="text-emerald-800">
                Vous êtes <b>Autorité (A)</b> sur cette activité. Vous pouvez <b>Valider</b> ou <b>Rejeter</b> le travail.
              </AlertDescription>
            </>
          )}
          {raciPerm.user_role === 'R' && (
            <>
              <Edit className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Réalisateur (R)</AlertTitle>
              <AlertDescription className="text-blue-800">
                Vous êtes <b>Réalisateur (R)</b>. Vous pouvez <b>saisir et soumettre</b> à validation.
              </AlertDescription>
            </>
          )}
          {(raciPerm.user_role === 'C' || raciPerm.user_role === 'I') && (
            <>
              <AlertTriangle className="h-4 w-4 text-slate-600" />
              <AlertTitle className="text-slate-900">Lecture seule</AlertTitle>
              <AlertDescription className="text-slate-800">
                Vous avez un accès en <b>lecture seule</b> sur cette activité.
              </AlertDescription>
            </>
          )}
          {raciPerm.user_role === '-' && (
            <>
              <X className="h-4 w-4 text-rose-600" />
              <AlertTitle className="text-rose-900">Non assigné</AlertTitle>
              <AlertDescription className="text-rose-800">
                Vous n'êtes <b>pas assigné</b> à cette activité.
              </AlertDescription>
            </>
          )}
        </Alert>
      )}

      {/* Alert pédagogique */}
      <Alert className="bg-blue-50 border-blue-200">
        <Lightbulb className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Vision globale, pas inventaire exhaustif (PDF p. 58)</AlertTitle>
        <AlertDescription className="text-blue-800">
          L'objectif n'est <b>pas</b> de lister exhaustivement tous les composants, mais d'identifier les <b>principales valeurs métier</b> et leurs <b>biens supports essentiels</b>.
        </AlertDescription>
      </Alert>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une VM..." 
                className="pl-9" 
              />
            </div>

            <div className="relative">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" /> Filtres
                {hasActiveFilters && <span className="ml-1 w-2 h-2 rounded-full bg-[#7a2333]" />}
              </Button>
              
              {showFilters && (
                <Card className="absolute top-full left-0 mt-2 w-80 z-50 shadow-lg">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Filtres DIC</h4>
                        <Button variant="ghost" size="sm" onClick={resetFilters}>Réinitialiser</Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Disponibilité min</Label>
                          <Input
                            type="number"
                            min="0"
                            max="4"
                            value={filterDMin}
                            onChange={(e) => setFilterDMin(parseInt(e.target.value) || 0)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Intégrité min</Label>
                          <Input
                            type="number"
                            min="0"
                            max="4"
                            value={filterIMin}
                            onChange={(e) => setFilterIMin(parseInt(e.target.value) || 0)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Confidentialité min</Label>
                          <Input
                            type="number"
                            min="0"
                            max="4"
                            value={filterCMin}
                            onChange={(e) => setFilterCMin(parseInt(e.target.value) || 0)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs"># BS min</Label>
                          <Input
                            type="number"
                            min="0"
                            value={filterBSMin}
                            onChange={(e) => setFilterBSMin(parseInt(e.target.value) || 0)}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="completeOnly"
                            checked={filterCompleteOnly}
                            onChange={(e) => setFilterCompleteOnly(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="completeOnly" className="text-sm">VM complètes uniquement</Label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Select value={sortBy} onValueChange={(v: SortBy) => setSortBy(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nom">Nom (A-Z)</SelectItem>
                <SelectItem value="D">Disponibilité ↓</SelectItem>
                <SelectItem value="I">Intégrité ↓</SelectItem>
                <SelectItem value="C">Confidentialité ↓</SelectItem>
                <SelectItem value="bsCount"># BS ↓</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
              >
                <Briefcase className="h-4 w-4 mr-1" /> Templates
              </Button>
              
              {showTemplates && (
                <Card className="absolute top-full right-0 mt-2 w-80 z-50 shadow-lg">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Templates de VM</h4>
                      {VM_TEMPLATES.map((template, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => handleUseTemplate(template)}
                        >
                          <div>
                            <div className="font-medium text-sm">{template.nom}</div>
                            <div className="text-xs text-slate-500">{template.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Button 
              onClick={() => {
                setEditingValeur(null);
                setNewValeur({ besoin_disponibilite: 1, besoin_integrite: 1, besoin_confidentialite: 1 });
                setShowCreateVM(true);
              }}
              disabled={!raciPerm?.can_write}
              className="bg-[#7a2333] hover:bg-[#7a2333]/90"
            >
              <Plus className="h-4 w-4 mr-1" /> Nouvelle VM
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {valeurs.length === 0 && (
        <Card className="p-12 text-center">
          <Database className="h-16 w-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune valeur métier définie</h3>
          <p className="text-slate-500 mb-6">Commencez par créer une valeur métier ou utilisez un template.</p>
          <div className="flex justify-center gap-3">
            <Button
              onClick={() => {
                setEditingValeur(null);
                setNewValeur({ besoin_disponibilite: 1, besoin_integrite: 1, besoin_confidentialite: 1 });
                setShowCreateVM(true);
              }}
              className="bg-[#7a2333] hover:bg-[#7a2333]/90"
            >
              <Plus className="h-4 w-4 mr-2" /> Créer une VM
            </Button>
            <Button variant="outline" onClick={() => setShowTemplates(true)}>
              <Briefcase className="h-4 w-4 mr-2" /> Utiliser un template
            </Button>
          </div>
        </Card>
      )}

      {/* VM Cards Grid */}
      {filteredAndSortedValeurs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAndSortedValeurs.map((vm) => {
            const bsList = biensSupports[vm.id!] || [];
            const complete = isVMComplete(vm, bsList.length);
            const expanded = expandedValeur === vm.id;
            
            return (
              <TooltipProvider key={vm.id}>
                <Card className={cn("overflow-hidden transition-all", complete && "ring-2 ring-emerald-200")}>
                  <div 
                    className="p-4 cursor-pointer hover:bg-slate-50" 
                    onClick={() => handleToggleExpand(vm.id!)}
                  >
                    <div className="flex items-start gap-3">
                      <button className="mt-0.5 text-slate-400" type="button">
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900">{vm.nom}</h3>
                          {complete && <Badge className="bg-emerald-100 text-emerald-700">✓ Complète</Badge>}
                        </div>
                        {vm.description && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{vm.description}</p>
                        )}
                        {vm.activite_metier_associee && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            <Briefcase className="h-3 w-3 mr-1" /> {vm.activite_metier_associee}
                          </Badge>
                        )}
                        
                        {/* 3 pastilles DIC */}
                        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                          {(['D', 'I', 'C'] as CritereDIC[]).map(critere => {
                            const niveau = critere === 'D' ? vm.besoin_disponibilite
                              : critere === 'I' ? vm.besoin_integrite
                              : vm.besoin_confidentialite;
                            return (
                              <Tooltip key={critere}>
                                <TooltipTrigger asChild>
                                  <div className={cn(
                                    "min-w-[44px] h-7 px-2 rounded-md flex items-center justify-center gap-1 text-xs font-bold border",
                                    getIntensiteClass(critere, niveau as NiveauBesoin)
                                  )}>
                                    <span>{critere}</span><span>{niveau || '—'}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p><b>{DIC_CRITERES[critere].fullName}</b> : {niveau ? NIVEAUX_BESOIN[niveau as NiveauBesoin].label : 'Non défini'}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                          <Badge variant="outline" className="ml-auto text-xs">{bsList.length} BS</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => handleEditValeur(vm)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDuplicateValeur(vm)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleDeleteValeur(vm.id!)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded BS Section */}
                  {expanded && (
                    <div className="border-t border-slate-200 p-4 bg-slate-50">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">Biens supports associés</h4>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedValeurForBS(vm.id!);
                              setShowCreateBS(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Ajouter
                          </Button>
                        </div>
                        
                        {bsList.length === 0 ? (
                          <p className="text-sm text-slate-500">Aucun bien support</p>
                        ) : (
                          <div className="space-y-2">
                            {bsList.map((bien) => {
                              const bsType = BS_TYPES[bien.type as BSType];
                              const Icon = bsType.icon;
                              return (
                                <div key={bien.id} className="flex items-center justify-between bg-white p-2 rounded border">
                                  <div className="flex items-center gap-2">
                                    <div className={cn("p-1.5 rounded", bsType.bgClass)}>
                                      <Icon className={cn("h-4 w-4", bsType.textClass)} />
                                    </div>
                                    <div>
                                      <span className="font-medium">{bien.nom}</span>
                                      <span className="ml-2 text-xs text-slate-500">({bsType.label})</span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteBienSupport(bien.id!, vm.id!)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </TooltipProvider>
            );
          })}
        </div>
      )}

      {/* Footer Actions */}
      {valeurs.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              {canTerminer ? (
                <span className="flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Toutes les VM sont complètes
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700">
                  <AlertTriangle className="h-4 w-4" /> {valeurs.length - completionStats.complete} VM incomplète(s) (D/I/C + BS requis)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {currentStatut !== 'EN_COURS' && (
                <Button variant="secondary" onClick={() => onStatutChange('EN_COURS')}>
                  <Clock className="h-4 w-4 mr-2" /> Marquer "En cours"
                </Button>
              )}
              <Button 
                disabled={!canTerminer} 
                onClick={() => onStatutChange('TERMINE')}
                className="bg-[#7a2333] hover:bg-[#7a2333]/90 disabled:bg-slate-300"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Marquer "Terminée"
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Create/Edit VM Modal */}
      {showCreateVM && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingValeur ? 'Modifier' : 'Créer'} une valeur métier</CardTitle>
              <CardDescription>
                Définissez les besoins DIC (Disponibilité, Intégrité, Confidentialité) pour cette valeur métier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={newValeur.nom || ''}
                    onChange={(e) => setNewValeur({ ...newValeur, nom: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newValeur.description || ''}
                    onChange={(e) => setNewValeur({ ...newValeur, description: e.target.value })}
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="activite">Activité métier associée</Label>
                  <Input
                    id="activite"
                    value={newValeur.activite_metier_associee || ''}
                    onChange={(e) => setNewValeur({ ...newValeur, activite_metier_associee: e.target.value })}
                  />
                </div>
                
                {/* 3 sliders DIC */}
                <div className="grid grid-cols-3 gap-3">
                  {(['D', 'I', 'C'] as CritereDIC[]).map(critere => {
                    const fieldName = critere === 'D' ? 'besoin_disponibilite'
                      : critere === 'I' ? 'besoin_integrite' : 'besoin_confidentialite';
                    const value = (newValeur as any)[fieldName] || 1;
                    return (
                      <div key={critere} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className={cn("text-xs font-bold", DIC_CRITERES[critere].textClass)}>
                            {critere} — {DIC_CRITERES[critere].fullName}
                          </Label>
                          <span className="text-sm font-bold">{value}/4</span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map(n => (
                            <button 
                              key={n} 
                              type="button"
                              onClick={() => setNewValeur({ ...newValeur, [fieldName]: n })}
                              className={cn(
                                "flex-1 h-9 rounded text-sm font-bold border transition-all",
                                value === n
                                  ? `${DIC_CRITERES[critere].bgClass} ${DIC_CRITERES[critere].textClass} border-current` 
                                  : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                              )}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">{NIVEAUX_BESOIN[value as NiveauBesoin].description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => {
                  setShowCreateVM(false);
                  setEditingValeur(null);
                  setNewValeur({ besoin_disponibilite: 1, besoin_integrite: 1, besoin_confidentialite: 1 });
                }}>
                  Annuler
                </Button>
                <Button onClick={editingValeur ? handleUpdateValeur : handleCreateValeur} className="bg-[#7a2333] hover:bg-[#7a2333]/90">
                  {editingValeur ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create BS Modal */}
      {showCreateBS && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Ajouter un bien support</CardTitle>
              <CardDescription>
                Sélectionnez le type de bien support et renseignez ses informations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bien-nom">Nom *</Label>
                  <Input
                    id="bien-nom"
                    value={newBienSupport.nom || ''}
                    onChange={(e) => setNewBienSupport({ ...newBienSupport, nom: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="bien-type">Type *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {BSTYPE_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setNewBienSupport({ ...newBienSupport, type: option.value as BSType })}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded-lg border-2 transition-all",
                            newBienSupport.type === option.value
                              ? `${option.bgClass} ${option.textClass} border-current`
                              : "bg-white border-slate-200 hover:border-slate-300"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="bien-description">Description</Label>
                  <Textarea
                    id="bien-description"
                    value={newBienSupport.description || ''}
                    onChange={(e) => setNewBienSupport({ ...newBienSupport, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => {
                  setShowCreateBS(false);
                  setSelectedValeurForBS(null);
                  setNewBienSupport({ type: 'MATERIEL' });
                }}>
                  Annuler
                </Button>
                <Button onClick={handleCreateBienSupport} className="bg-[#7a2333] hover:bg-[#7a2333]/90">
                  Ajouter
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
