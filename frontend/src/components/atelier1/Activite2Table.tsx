import { useState, useEffect } from 'react';
import { atelier1Api, ValeurMetier, BienSupport, BienSupportType, ActiviteStatut } from '../../api/atelier1';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { List, FolderTree, Filter, ChevronDown, ChevronRight } from 'lucide-react';

interface Activite2TableProps {
  projectId: string;
  onStatutChange: (statut: ActiviteStatut) => void;
  currentStatut: ActiviteStatut;
}

export default function Activite2Table({ projectId, onStatutChange, currentStatut }: Activite2TableProps) {
  const [valeurs, setValeurs] = useState<ValeurMetier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateBienSupportModal, setShowCreateBienSupportModal] = useState(false);
  const [selectedValeurForBienSupport, setSelectedValeurForBienSupport] = useState<string | null>(null);
  const [expandedValeur, setExpandedValeur] = useState<string | null>(null);
  const [biensSupports, setBiensSupports] = useState<Record<string, BienSupport[]> >({});
  const [newValeur, setNewValeur] = useState<Partial<ValeurMetier>>({
    besoin_disponibilite: 1,
    besoin_integrite: 1,
    besoin_confidentialite: 1,
  });
  const [newBienSupport, setNewBienSupport] = useState<Partial<BienSupport>>({
    type: 'MATERIEL',
  });
  
  // View mode: 'list' or 'tree'
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  
  // Filters
  const [filterDMin, setFilterDMin] = useState(0);
  const [filterIMin, setFilterIMin] = useState(0);
  const [filterCMin, setFilterCMin] = useState(0);
  const [filterBSMin, setFilterBSMin] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

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

  const handleCreateValeur = async () => {
    try {
      await atelier1Api.createValeurMetier(projectId, newValeur);
      setShowCreateModal(false);
      setNewValeur({ besoin_disponibilite: 1, besoin_integrite: 1, besoin_confidentialite: 1 });
      loadValeurs();
    } catch (err) {
      console.error('Error creating valeur:', err);
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

  const handleCreateBienSupport = async () => {
    if (!selectedValeurForBienSupport) return;
    try {
      await atelier1Api.createBienSupport(selectedValeurForBienSupport, newBienSupport);
      setShowCreateBienSupportModal(false);
      setSelectedValeurForBienSupport(null);
      setNewBienSupport({ type: 'MATERIEL' });
      loadBiensSupports(selectedValeurForBienSupport);
    } catch (err) {
      console.error('Error creating bien support:', err);
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

  const getBesoinColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-gray-200 text-gray-700';
      case 2: return 'bg-blue-200 text-blue-700';
      case 3: return 'bg-orange-200 text-orange-700';
      case 4: return 'bg-red-200 text-red-700';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const filteredValeurs = valeurs.filter(v => {
    const bsCount = biensSupports[v.id!]?.length || 0;
    return (
      v.besoin_disponibilite >= filterDMin &&
      v.besoin_integrite >= filterIMin &&
      v.besoin_confidentialite >= filterCMin &&
      bsCount >= filterBSMin
    );
  });

  const getCompletenessStatus = () => {
    if (valeurs.length === 0) return { status: 'none', message: 'Aucune VM créée' };
    
    const incompleteVM = valeurs.filter(v => 
      !v.besoin_disponibilite || !v.besoin_integrite || !v.besoin_confidentialite ||
      (biensSupports[v.id!]?.length || 0) === 0
    );
    
    if (incompleteVM.length === 0) return { status: 'complete', message: 'Toutes les VM sont complètes' };
    if (incompleteVM.length === valeurs.length) return { status: 'none', message: 'Aucune VM complète' };
    return { status: 'partial', message: `${incompleteVM.length} VM incomplètes` };
  };

  const completeness = getCompletenessStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Valeurs métier & Biens Supports</h3>
          <div className={`flex items-center gap-2 mt-1 text-sm ${
            completeness.status === 'complete' ? 'text-green-600' :
            completeness.status === 'partial' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              completeness.status === 'complete' ? 'bg-green-500' :
              completeness.status === 'partial' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}></span>
            {completeness.message}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white'}`}
              title="Vue liste"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-2 text-sm ${viewMode === 'tree' ? 'bg-blue-500 text-white' : 'bg-white'}`}
              title="Vue arbre"
            >
              <FolderTree className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>+ Nouvelle valeur métier</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="border rounded-lg p-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700"
        >
          <Filter className="w-4 h-4" />
          Filtres
          {showFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {showFilters && (
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">D min</Label>
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
              <Label className="text-xs">I min</Label>
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
              <Label className="text-xs">C min</Label>
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
              <Label className="text-xs">#BS min</Label>
              <Input
                type="number"
                min="0"
                value={filterBSMin}
                onChange={(e) => setFilterBSMin(parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table/List View */}
      {filteredValeurs.length === 0 && valeurs.length > 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Aucune valeur métier ne correspond aux filtres</p>
        </div>
      ) : filteredValeurs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Aucune valeur métier définie</p>
          <Button onClick={() => setShowCreateModal(true)} className="mt-4">
            Créer la première valeur métier
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">D</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">I</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">C</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">#BS</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredValeurs.map((valeur) => (
                <>
                  <tr key={valeur.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleExpand(valeur.id!)}
                        className="flex items-center space-x-2 text-left"
                      >
                        <span className="text-gray-400">{expandedValeur === valeur.id ? '−' : '+'}</span>
                        <span className="font-medium">{valeur.nom}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{valeur.description || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${getBesoinColor(valeur.besoin_disponibilite)}`}>
                        {valeur.besoin_disponibilite}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${getBesoinColor(valeur.besoin_integrite)}`}>
                        {valeur.besoin_integrite}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${getBesoinColor(valeur.besoin_confidentialite)}`}>
                        {valeur.besoin_confidentialite}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium">{biensSupports[valeur.id!]?.length || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteValeur(valeur.id!)}
                      >
                        Supprimer
                      </Button>
                    </td>
                  </tr>
                  {expandedValeur === valeur.id && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 bg-gray-50">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">Biens supports associés</h4>
                          {biensSupports[valeur.id!]?.length === 0 ? (
                            <p className="text-sm text-gray-500">Aucun bien support</p>
                          ) : (
                            <div className="space-y-2">
                              {biensSupports[valeur.id!]?.map((bien) => (
                                <div key={bien.id} className="flex items-center justify-between bg-white p-2 rounded border">
                                  <div>
                                    <span className="font-medium">{bien.nom}</span>
                                    <span className="ml-2 text-xs text-gray-500">({bien.type})</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => atelier1Api.deleteBienSupport(bien.id!).then(() => loadBiensSupports(valeur.id!))}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedValeurForBienSupport(valeur.id!);
                              setShowCreateBienSupportModal(true);
                            }}
                          >
                            + Ajouter un bien support
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Créer une valeur métier</h3>
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
                <textarea
                  id="description"
                  value={newValeur.description || ''}
                  onChange={(e) => setNewValeur({ ...newValeur, description: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md"
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Disponibilité (1-4)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="4"
                    value={newValeur.besoin_disponibilite}
                    onChange={(e) => setNewValeur({ ...newValeur, besoin_disponibilite: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Intégrité (1-4)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="4"
                    value={newValeur.besoin_integrite}
                    onChange={(e) => setNewValeur({ ...newValeur, besoin_integrite: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Confidentialité (1-4)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="4"
                    value={newValeur.besoin_confidentialite}
                    onChange={(e) => setNewValeur({ ...newValeur, besoin_confidentialite: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Annuler</Button>
              <Button onClick={handleCreateValeur}>Créer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Bien Support Modal */}
      {showCreateBienSupportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Créer un bien support</h3>
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
                <select
                  id="bien-type"
                  value={newBienSupport.type || 'MATERIEL'}
                  onChange={(e) => setNewBienSupport({ ...newBienSupport, type: e.target.value as BienSupportType })}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="MATERIEL">Matériel</option>
                  <option value="LOGICIEL">Logiciel</option>
                  <option value="DONNEES">Données</option>
                  <option value="SERVICE">Service</option>
                  <option value="RESEAU">Réseau</option>
                </select>
              </div>
              <div>
                <Label htmlFor="bien-description">Description</Label>
                <textarea
                  id="bien-description"
                  value={newBienSupport.description || ''}
                  onChange={(e) => setNewBienSupport({ ...newBienSupport, description: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => {
                setShowCreateBienSupportModal(false);
                setSelectedValeurForBienSupport(null);
              }}>Annuler</Button>
              <Button onClick={handleCreateBienSupport}>Créer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          onClick={() => onStatutChange(currentStatut === 'TERMINE' ? 'EN_COURS' : 'TERMINE')}
          variant={currentStatut === 'TERMINE' ? 'outline' : 'default'}
        >
          {currentStatut === 'TERMINE' ? 'Marquer comme en cours' : 'Marquer comme terminé'}
        </Button>
      </div>
    </div>
  );
}
