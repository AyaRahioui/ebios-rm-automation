import { useState, useEffect } from 'react';
import { atelier1Api, ReferentielSecurite, ControleConformite, ActionCorrective, Priorite, StatutAction, ActiviteStatut } from '../../api/atelier1';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface Activite4FormProps {
  projectId: string;
  onStatutChange: (statut: ActiviteStatut) => void;
  currentStatut: ActiviteStatut;
}

export default function Activite4Form({ projectId, onStatutChange, currentStatut }: Activite4FormProps) {
  const [activeSubTab, setActiveSubTab] = useState<'referentiels' | 'controles' | 'maturite' | 'actions'>('referentiels');
  const [referentiels, setReferentiels] = useState<ReferentielSecurite[]>([]);
  const [controles, setControles] = useState<ControleConformite[]>([]);
  const [actions, setActions] = useState<ActionCorrective[]>([]);
  const [maturite, setMaturite] = useState<{ niveau_maturite_moyen: number | null; nombre_controles_evalues: number; nombre_controles_total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newItem, setNewItem] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [projectId, activeSubTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      switch (activeSubTab) {
        case 'referentiels':
          const refRes = await atelier1Api.getReferentiels(projectId);
          setReferentiels(refRes.data.referentiels);
          break;
        case 'controles':
          const ctrlRes = await atelier1Api.getControlesConformite(projectId);
          setControles(ctrlRes.data.controles);
          break;
        case 'maturite':
          const matRes = await atelier1Api.getMaturiteSynthetique(projectId);
          setMaturite(matRes.data);
          break;
        case 'actions':
          const actRes = await atelier1Api.getActionsCorrectives(projectId);
          setActions(actRes.data.actions);
          break;
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      switch (activeSubTab) {
        case 'referentiels':
          await atelier1Api.createReferentiel(projectId, newItem);
          break;
        case 'controles':
          await atelier1Api.createControleConformite(projectId, newItem);
          break;
        case 'actions':
          await atelier1Api.createActionCorrective(projectId, newItem);
          break;
      }
      setShowCreateModal(false);
      setNewItem({});
      loadData();
    } catch (err) {
      console.error('Error creating item:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
    try {
      switch (activeSubTab) {
        case 'referentiels':
          await atelier1Api.deleteReferentiel(id);
          break;
        case 'controles':
          await atelier1Api.deleteControleConformite(id);
          break;
        case 'actions':
          await atelier1Api.deleteActionCorrective(id);
          break;
      }
      loadData();
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };



  const getPrioriteColor = (priorite: Priorite) => {
    switch (priorite) {
      case 'FAIBLE': return 'bg-gray-100 text-gray-700';
      case 'MOYENNE': return 'bg-blue-100 text-blue-700';
      case 'HAUTE': return 'bg-orange-100 text-orange-700';
      case 'CRITIQUE': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatutActionColor = (statut: StatutAction) => {
    switch (statut) {
      case 'A_FAIRE': return 'bg-gray-100 text-gray-700';
      case 'EN_COURS': return 'bg-blue-100 text-blue-700';
      case 'FAIT': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatutControleColor = (statut: string) => {
    switch (statut) {
      case 'PLANIFIE': return 'bg-gray-100 text-gray-700';
      case 'EN_COURS': return 'bg-blue-100 text-blue-700';
      case 'EFFECTUE': return 'bg-green-100 text-green-700';
      case 'ANNULE': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const subTabs = [
    { id: 'referentiels', label: 'Référentiels applicables' },
    { id: 'controles', label: 'Planification des contrôles' },
    { id: 'maturite', label: 'Évaluation / Niveau de maturité' },
    { id: 'actions', label: 'Actions correctives' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSubTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Référentiels */}
        {activeSubTab === 'referentiels' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Référentiels de sécurité</h3>
              <Button onClick={() => setShowCreateModal(true)}>Ajouter un référentiel</Button>
            </div>
            {referentiels.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun référentiel défini</p>
            ) : (
              <div className="space-y-2">
                {referentiels.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">{ref.nom}</span>
                      {ref.obligatoire && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Obligatoire</span>}
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(ref.id!)}>
                      Supprimer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contrôles */}
        {activeSubTab === 'controles' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Contrôles de conformité</h3>
              <Button onClick={() => setShowCreateModal(true)}>Ajouter un contrôle</Button>
            </div>
            {controles.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun contrôle planifié</p>
            ) : (
              <div className="space-y-2">
                {controles.map((ctrl) => (
                  <div key={ctrl.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <span className="font-medium">{ctrl.activite_metier}</span>
                      <span className="ml-2 text-xs px-2 py-1 rounded {getStatutControleColor(ctrl.statut)}">
                        {ctrl.statut}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(ctrl.date_planifiee).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(ctrl.id!)}>
                      Supprimer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Maturité */}
        {activeSubTab === 'maturite' && (
          <div className="space-y-6">
            <h3 className="font-semibold">Niveau de maturité synthétique</h3>
            {maturite ? (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-3xl font-bold text-blue-600">
                      {maturite.niveau_maturite_moyen ? maturite.niveau_maturite_moyen.toFixed(1) : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">Niveau moyen</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-600">{maturite.nombre_controles_evalues}</p>
                    <p className="text-sm text-gray-600">Évalués</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-600">{maturite.nombre_controles_total}</p>
                    <p className="text-sm text-gray-600">Total</p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-blue-600 h-4 rounded-full transition-all"
                      style={{
                        width: maturite.nombre_controles_total > 0
                          ? `${(maturite.nombre_controles_evalues / maturite.nombre_controles_total) * 100}%`
                          : '0%'
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    {maturite.nombre_controles_total > 0
                      ? `${Math.round((maturite.nombre_controles_evalues / maturite.nombre_controles_total) * 100)}% des contrôles évalués`
                      : 'Aucun contrôle à évaluer'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Données de maturité non disponibles</p>
            )}
          </div>
        )}

        {/* Actions */}
        {activeSubTab === 'actions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Actions correctives</h3>
              <Button onClick={() => setShowCreateModal(true)}>Ajouter une action</Button>
            </div>
            {actions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucune action corrective définie</p>
            ) : (
              <div className="space-y-2">
                {actions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <span className="font-medium">{action.description}</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded ${getPrioriteColor(action.priorite)}`}>
                          {action.priorite}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${getStatutActionColor(action.statut)}`}>
                          {action.statut}
                        </span>
                      </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(action.id!)}>
                      Supprimer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {activeSubTab === 'referentiels' && 'Ajouter un référentiel'}
              {activeSubTab === 'controles' && 'Ajouter un contrôle'}
              {activeSubTab === 'actions' && 'Ajouter une action'}
            </h3>
            <div className="space-y-4">
              {activeSubTab === 'referentiels' && (
                <>
                  <div>
                    <Label>Nom *</Label>
                    <Input
                      value={newItem.nom || ''}
                      onChange={(e) => setNewItem({ ...newItem, nom: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <textarea
                      value={newItem.description || ''}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="w-full mt-1 p-2 border rounded-md"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newItem.obligatoire || false}
                      onChange={(e) => setNewItem({ ...newItem, obligatoire: e.target.checked })}
                    />
                    <Label>Obligatoire</Label>
                  </div>
                </>
              )}
              {activeSubTab === 'controles' && (
                <>
                  <div>
                    <Label>Référentiel *</Label>
                    <select
                      value={newItem.referentiel_id || ''}
                      onChange={(e) => setNewItem({ ...newItem, referentiel_id: e.target.value })}
                      className="w-full mt-1 p-2 border rounded-md"
                    >
                      <option value="">Sélectionner...</option>
                      {referentiels.map((ref) => (
                        <option key={ref.id} value={ref.id}>{ref.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Activité métier *</Label>
                    <Input
                      value={newItem.activite_metier || ''}
                      onChange={(e) => setNewItem({ ...newItem, activite_metier: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Date planifiée *</Label>
                    <Input
                      type="date"
                      value={newItem.date_planifiee?.split('T')[0] || ''}
                      onChange={(e) => setNewItem({ ...newItem, date_planifiee: e.target.value })}
                    />
                  </div>
                </>
              )}
              {activeSubTab === 'actions' && (
                <>
                  <div>
                    <Label>Description *</Label>
                    <textarea
                      value={newItem.description || ''}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="w-full mt-1 p-2 border rounded-md"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Priorité</Label>
                    <select
                      value={newItem.priorite || 'MOYENNE'}
                      onChange={(e) => setNewItem({ ...newItem, priorite: e.target.value })}
                      className="w-full mt-1 p-2 border rounded-md"
                    >
                      <option value="FAIBLE">Faible</option>
                      <option value="MOYENNE">Moyenne</option>
                      <option value="HAUTE">Haute</option>
                      <option value="CRITIQUE">Critique</option>
                    </select>
                  </div>
                  <div>
                    <Label>Statut</Label>
                    <select
                      value={newItem.statut || 'A_FAIRE'}
                      onChange={(e) => setNewItem({ ...newItem, statut: e.target.value })}
                      className="w-full mt-1 p-2 border rounded-md"
                    >
                      <option value="A_FAIRE">À faire</option>
                      <option value="EN_COURS">En cours</option>
                      <option value="FAIT">Fait</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Annuler</Button>
              <Button onClick={handleCreate}>Créer</Button>
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
