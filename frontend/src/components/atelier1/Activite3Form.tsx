import { useState, useEffect } from 'react';
import { atelier1Api, EvenementRedoute, CritereImpact, Gravite, ActiviteStatut } from '../../api/atelier1';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useEchelleGravite } from '../../hooks/useEchelleGravite';

interface Activite3FormProps {
  projectId: string;
  onStatutChange: (statut: ActiviteStatut) => void;
  currentStatut: ActiviteStatut;
}

export default function Activite3Form({ projectId, onStatutChange, currentStatut }: Activite3FormProps) {
  const [evenements, setEvenements] = useState<EvenementRedoute[]>([]);
  const [criteres, setCriteres] = useState<CritereImpact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCartographie, setShowCartographie] = useState(false);
  const [cartographie, setCartographie] = useState<{
    evenements_par_gravite: Record<string, EvenementRedoute[]>;
    valeurs_metier_par_gravite: Record<string, any[]>;
  } | null>(null);
  const [newEvenement, setNewEvenement] = useState<Partial<EvenementRedoute>>({
    gravite: 'G1',
    gravite_surchargee: false,
  });
  const [selectedImpacts, setSelectedImpacts] = useState<Record<string, number>>({});
  const [calculatedGravite, setCalculatedGravite] = useState<Gravite>('G1');
  
  // Use the dynamic gravity scale hook
  const { echelle, niveaux, loading: echelleLoading, getCouleur, getLibelle } = useEchelleGravite(projectId);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [evenementsRes, criteresRes] = await Promise.all([
        atelier1Api.getEvenementsRedoutes(projectId),
        atelier1Api.getCriteresImpact(projectId),
      ]);
      setEvenements(evenementsRes.data.evenements);
      setCriteres(criteresRes.data.criteres);
    } catch (err) {
      console.error('Error loading data:', err);
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

  const calculateGravite = (cotations: number[]) => {
    if (!cotations.length) return 'G1';
    const max = Math.max(...cotations);
    if (max === 1) return 'G2';
    if (max === 2) return 'G3';
    if (max === 3) return 'G4';
    if (max === 4) return 'G5';
    return 'G1';
  };

  useEffect(() => {
    const cotations = Object.values(selectedImpacts);
    setCalculatedGravite(calculateGravite(cotations) as Gravite);
  }, [selectedImpacts]);

  const handleCreateEvenement = async () => {
    try {
      const payload = {
        ...newEvenement,
        gravite: newEvenement.gravite_surchargee ? newEvenement.gravite : calculatedGravite,
        impacts: Object.entries(selectedImpacts).map(([critereId, cotation]) => ({
          critere_impact_id: critereId,
          cotation,
        })),
      };
      await atelier1Api.createEvenementRedoute(projectId, payload);
      setShowCreateModal(false);
      setNewEvenement({ gravite: 'G1', gravite_surchargee: false });
      setSelectedImpacts({});
      loadData();
    } catch (err) {
      console.error('Error creating evenement:', err);
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

  const getGraviteColor = (gravite: Gravite) => {
    // Use dynamic color from the gravity scale if available
    if (echelle && echelle.niveaux) {
      const niveau = echelle.niveaux.find(n => n.code === gravite);
      if (niveau) return `bg-[${niveau.couleur}] text-white`;
    }
    // Fallback to static colors
    switch (gravite) {
      case 'G1': return 'bg-gray-200 text-gray-700';
      case 'G2': return 'bg-blue-200 text-blue-700';
      case 'G3': return 'bg-yellow-200 text-yellow-700';
      case 'G4': return 'bg-orange-200 text-orange-700';
      case 'G5': return 'bg-red-600 text-white';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const getGraviteLabel = (gravite: Gravite) => {
    // Use dynamic label from the gravity scale if available
    if (echelle && echelle.niveaux) {
      const niveau = echelle.niveaux.find(n => n.code === gravite);
      if (niveau) return niveau.libelle;
    }
    // Fallback to static labels
    switch (gravite) {
      case 'G1': return 'Mineure';
      case 'G2': return 'Significative';
      case 'G3': return 'Grave';
      case 'G4': return 'Critique';
      case 'G5': return 'Catastrophique';
      default: return gravite;
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Événements redoutés</h3>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => loadCartographie()}>
            Voir cartographie
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            Ajouter un événement
          </Button>
        </div>
      </div>

      {/* Cartographie View */}
      {showCartographie && cartographie && (
        <div className="bg-white border rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Cartographie de gravité</h4>
            <Button variant="ghost" onClick={() => setShowCartographie(false)}>×</Button>
          </div>
          
          <div>
            <h5 className="font-medium mb-3">Événements par gravité</h5>
            {niveaux.slice().reverse().map((niveau) => (
              <div key={niveau.code} className="mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <span 
                    className="px-2 py-1 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: niveau.couleur }}
                  >
                    {niveau.code} - {niveau.libelle}
                  </span>
                  <span className="text-sm text-gray-500">({cartographie.evenements_par_gravite[niveau.code]?.length || 0})</span>
                </div>
                {cartographie.evenements_par_gravite[niveau.code]?.map((evt) => (
                  <div key={evt.id} className="ml-4 text-sm text-gray-600 py-1">
                    • {evt.nom}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {evenements.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Aucun événement redouté défini</p>
          <Button onClick={() => setShowCreateModal(true)} className="mt-4">
            Créer le premier événement
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nom</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Gravité</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Surchargée</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {evenements.map((evenement) => (
                <tr key={evenement.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{evenement.nom}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{evenement.description || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getGraviteColor(evenement.gravite)}`}>
                      {evenement.gravite}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {evenement.gravite_surchargee ? (
                      <span className="text-orange-600">✓</span>
                    ) : (
                      <span className="text-gray-400">−</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteEvenement(evenement.id!)}
                    >
                      Supprimer
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Créer un événement redouté</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={newEvenement.nom || ''}
                  onChange={(e) => setNewEvenement({ ...newEvenement, nom: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={newEvenement.description || ''}
                  onChange={(e) => setNewEvenement({ ...newEvenement, description: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md"
                  rows={3}
                />
              </div>
              
              <div>
                <Label className="font-medium">Critères d'impact</Label>
                <div className="mt-2 space-y-2">
                  {criteres.map((critere) => (
                    <div key={critere.id} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{critere.nom}</span>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4].map((level) => (
                          <button
                            key={level}
                            onClick={() => {
                              setSelectedImpacts(prev => {
                                const newImpacts = { ...prev };
                                if (newImpacts[critere.id] === level) {
                                  delete newImpacts[critere.id];
                                } else {
                                  newImpacts[critere.id] = level;
                                }
                                return newImpacts;
                              });
                            }}
                            className={`w-8 h-8 rounded ${
                              selectedImpacts[critere.id] === level
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded">
                <Label>Gravité calculée: </Label>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${getGraviteColor(calculatedGravite)}`}>
                  {calculatedGravite} - {getGraviteLabel(calculatedGravite)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="gravite_surchargee"
                  checked={newEvenement.gravite_surchargee}
                  onChange={(e) => setNewEvenement({ ...newEvenement, gravite_surchargee: e.target.checked })}
                />
                <Label htmlFor="gravite_surchargee">Surcharger la gravité</Label>
              </div>

              {newEvenement.gravite_surchargee && (
                <>
                  <div>
                    <Label>Gravité personnalisée</Label>
                    <select
                      value={newEvenement.gravite}
                      onChange={(e) => setNewEvenement({ ...newEvenement, gravite: e.target.value as Gravite })}
                      className="w-full mt-1 p-2 border rounded-md"
                    >
                      {niveaux.map((niveau) => (
                        <option key={niveau.code} value={niveau.code}>
                          {niveau.code} - {niveau.libelle}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="justification">Justification *</Label>
                    <textarea
                      id="justification"
                      value={newEvenement.justification || ''}
                      onChange={(e) => setNewEvenement({ ...newEvenement, justification: e.target.value })}
                      className="w-full mt-1 p-2 border rounded-md"
                      rows={2}
                      placeholder="Expliquez pourquoi vous surchargez la gravité..."
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Annuler</Button>
              <Button onClick={handleCreateEvenement}>Créer</Button>
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
