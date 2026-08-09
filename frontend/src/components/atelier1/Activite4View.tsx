import { useState, useEffect } from 'react';
import { atelier1Api, ReferentielSecurite, ControleConformite, ActionCorrective, Ecart, ActiviteStatut, DomaineMaturite, MaturiteParDomaine, PlanTraitement } from '../../api/atelier1';
import { DOMAINE_LABELS, DOMAINE_COLORS, PRIORITE_COLORS, STATUT_ACTION_COLORS, STATUT_CONTROLE_COLORS } from '../../lib/domaines';
import { REFERENTIEL_TEMPLATES, getReferentielIcon } from '../../lib/referentiel-templates';
import PyramideSSI from './PyramideSSI';
import JaugesMaturite from './JaugesMaturite';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';

interface Activite4ViewProps {
  projectId: string;
  onStatutChange: (statut: ActiviteStatut) => void;
  currentStatut: ActiviteStatut;
}

export default function Activite4View({ projectId, onStatutChange, currentStatut }: Activite4ViewProps) {
  const [activeTab, setActiveTab] = useState<'referentiels' | 'controles' | 'maturite' | 'ecarts' | 'actions' | 'plan'>('referentiels');
  const [referentiels, setReferentiels] = useState<ReferentielSecurite[]>([]);
  const [controles, setControles] = useState<ControleConformite[]>([]);
  const [actions, setActions] = useState<ActionCorrective[]>([]);
  const [ecarts, setEcarts] = useState<Ecart[]>([]);
  const [maturiteParDomaine, setMaturiteParDomaine] = useState<MaturiteParDomaine[]>([]);
  const [planTraitement, setPlanTraitement] = useState<PlanTraitement | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItem, setNewItem] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [projectId, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      switch (activeTab) {
        case 'referentiels':
          const refRes = await atelier1Api.getReferentiels(projectId);
          setReferentiels(refRes.data.referentiels);
          // Also load controles for the table
          const contRes = await atelier1Api.getControlesConformite(projectId);
          setControles(contRes.data.controles);
          break;
        case 'controles':
          const ctrlRes = await atelier1Api.getControlesConformite(projectId);
          setControles(ctrlRes.data.controles);
          // Also load referentiels for the table
          const refRes2 = await atelier1Api.getReferentiels(projectId);
          setReferentiels(refRes2.data.referentiels);
          break;
        case 'maturite':
          const matRes = await atelier1Api.getMaturiteParDomaine(projectId);
          setMaturiteParDomaine(matRes.data.domaines);
          break;
        case 'ecarts':
          const ecartRes = await atelier1Api.getEcarts(projectId);
          setEcarts(ecartRes.data.ecarts);
          break;
        case 'actions':
          const actRes = await atelier1Api.getActionsCorrectives(projectId);
          setActions(actRes.data.actions);
          break;
        case 'plan':
          const planRes = await atelier1Api.getPlanTraitement(projectId);
          setPlanTraitement(planRes.data);
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
      switch (activeTab) {
        case 'referentiels':
          await atelier1Api.createReferentiel(projectId, { ...newItem, project_id: projectId });
          break;
        case 'controles':
          await atelier1Api.createControleConformite(projectId, newItem);
          break;
        case 'ecarts':
          // Generate next numero if not provided
          const nextNumero = ecarts.length > 0 ? Math.max(...ecarts.map(e => e.numero)) + 1 : 1;
          await atelier1Api.createEcart(projectId, { ...newItem, project_id: projectId, numero: nextNumero });
          break;
        case 'actions':
          await atelier1Api.createActionCorrective(projectId, newItem);
          break;
      }
      setShowCreateModal(false);
      setNewItem({});
      setEditingItem(null);
      loadData();
    } catch (err) {
      console.error('Error creating item:', err);
    }
  };

  const handleUpdate = async () => {
    try {
      switch (activeTab) {
        case 'referentiels':
          await atelier1Api.updateReferentiel(editingItem.id, newItem);
          break;
        case 'controles':
          await atelier1Api.updateControleConformite(editingItem.id, newItem);
          break;
        case 'ecarts':
          await atelier1Api.updateEcart(projectId, editingItem.id, newItem);
          break;
        case 'actions':
          await atelier1Api.updateActionCorrective(editingItem.id, newItem);
          break;
      }
      setShowCreateModal(false);
      setNewItem({});
      setEditingItem(null);
      loadData();
    } catch (err) {
      console.error('Error updating item:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
    try {
      switch (activeTab) {
        case 'referentiels':
          await atelier1Api.deleteReferentiel(projectId, id);
          break;
        case 'controles':
          await atelier1Api.deleteControleConformite(projectId, id);
          break;
        case 'ecarts':
          await atelier1Api.deleteEcart(projectId, id);
          break;
        case 'actions':
          await atelier1Api.deleteActionCorrective(projectId, id);
          break;
      }
      loadData();
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setNewItem({ ...item });
    setShowCreateModal(true);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setNewItem({});
    setShowCreateModal(true);
  };

  const handleSelectTemplate = (template: any) => {
    setNewItem({
      nom: template.nom,
      description: template.description,
      obligatoire: template.obligatoire,
      activites_metier_concernees: template.activites_metier_concernees || []
    });
    setShowCreateModal(true);
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
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="referentiels">📚 Référentiels</TabsTrigger>
          <TabsTrigger value="controles">✓ Contrôles</TabsTrigger>
          <TabsTrigger value="maturite">📊 Maturité</TabsTrigger>
          <TabsTrigger value="ecarts">⚠️ Écarts {ecarts.length > 0 && `(${ecarts.length})`}</TabsTrigger>
          <TabsTrigger value="actions">🔧 Actions {actions.length > 0 && `(${actions.length})`}</TabsTrigger>
          <TabsTrigger value="plan">📋 Plan</TabsTrigger>
        </TabsList>

        {/* Référentiels */}
        <TabsContent value="referentiels" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Référentiels de sécurité applicables</h3>
            <div className="flex space-x-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">📋 Templates</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Templates de référentiels</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    {REFERENTIEL_TEMPLATES.map((template, index) => (
                      <div
                        key={index}
                        className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{template.icon}</span>
                          <div>
                            <div className="font-medium">{template.nom}</div>
                            <div className="text-xs text-gray-600">{template.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
              <Button onClick={openCreateModal}>+ Ajouter un référentiel</Button>
            </div>
          </div>

          {referentiels.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500 mb-4">Aucun référentiel défini</p>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Commencez par sélectionner un template :</p>
                <div className="flex justify-center space-x-2">
                  {REFERENTIEL_TEMPLATES.slice(0, 3).map((template, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      {template.icon} {template.nom}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {referentiels.map((ref) => (
                <Card key={ref.id} className={ref.obligatoire ? "border-2 border-rose-300" : "border"}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <span className="text-xl">{getReferentielIcon(ref.nom)}</span>
                          {ref.nom}
                        </CardTitle>
                        {ref.obligatoire && (
                          <Badge className="bg-rose-100 text-rose-700 mt-2">Obligatoire</Badge>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(ref)}>✏️</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(ref.id!)}>🗑️</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{ref.description}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <span>{controles.filter(c => c.referentiel_id === ref.id).length} contrôles</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className="border-2 border-dashed border-gray-300 flex items-center justify-center min-h-[140px] cursor-pointer hover:border-[#8B1538]">
                <Button onClick={openCreateModal} variant="ghost">
                  <span className="text-2xl mr-2">+</span> Ajouter un référentiel
                </Button>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Contrôles */}
        <TabsContent value="controles" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Planification des contrôles de conformité</h3>
            <Button onClick={openCreateModal}>+ Ajouter un contrôle</Button>
          </div>

          {controles.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun contrôle planifié</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activité métier</TableHead>
                    <TableHead>Référentiel</TableHead>
                    <TableHead>Domaine</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date prévue</TableHead>
                    <TableHead>Réalisé le</TableHead>
                    <TableHead>Maturité</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {controles.map((ctrl) => (
                    <TableRow key={ctrl.id}>
                      <TableCell className="font-medium">{ctrl.activite_metier}</TableCell>
                      <TableCell>{referentiels.find(r => r.id === ctrl.referentiel_id)?.nom || '—'}</TableCell>
                      <TableCell>
                        {ctrl.domaine && DOMAINE_COLORS[ctrl.domaine] ? (
                          <Badge className={DOMAINE_COLORS[ctrl.domaine].bg + ' ' + DOMAINE_COLORS[ctrl.domaine].text}>
                            {DOMAINE_LABELS[ctrl.domaine]}
                          </Badge>
                        ) : ctrl.domaine ? (
                          <Badge className="bg-gray-100 text-gray-700">
                            {ctrl.domaine}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {STATUT_CONTROLE_COLORS[ctrl.statut] ? (
                          <Badge className={STATUT_CONTROLE_COLORS[ctrl.statut]}>{ctrl.statut}</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700">{ctrl.statut}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(ctrl.date_planifiee).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{ctrl.date_realisee ? new Date(ctrl.date_realisee).toLocaleDateString('fr-FR') : '—'}</TableCell>
                      <TableCell>
                        {ctrl.niveau_maturite ? '⭐'.repeat(ctrl.niveau_maturite) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(ctrl)}>✏️</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(ctrl.id!)}>🗑️</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Maturité */}
        <TabsContent value="maturite" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Pyramide SSI</h3>
              <PyramideSSI 
                maturiteCadre={maturiteParDomaine.find(d => d.domaine === 'SECURITE_INFO')?.pourcentage || 0}
                maturiteSocle={maturiteParDomaine.find(d => d.domaine === 'GESTION_TIERS')?.pourcentage || 0}
              />
            </div>
            <div>
              <h3 className="font-semibold mb-4">Niveau de maturité par domaine</h3>
              <JaugesMaturite 
                maturiteParDomaine={maturiteParDomaine}
                onDomaineClick={(domaine) => console.log('Domaine clicked:', domaine)}
              />
            </div>
          </div>
        </TabsContent>

        {/* Écarts */}
        <TabsContent value="ecarts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Écarts identifiés</h3>
            <Button onClick={openCreateModal}>+ Ajouter un écart</Button>
          </div>

          {ecarts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun écart identifié</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Domaine</TableHead>
                    <TableHead>Référentiel</TableHead>
                    <TableHead>Contrôle</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Cause</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ecarts.map((ecart) => (
                    <TableRow key={ecart.id}>
                      <TableCell className="font-mono text-xs">EC-{String(ecart.numero).padStart(2, '0')}</TableCell>
                      <TableCell>
                        <Badge className={DOMAINE_COLORS[ecart.domaine].bg + ' ' + DOMAINE_COLORS[ecart.domaine].text}>
                          {DOMAINE_LABELS[ecart.domaine]}
                        </Badge>
                      </TableCell>
                      <TableCell>{referentiels.find(r => r.id === ecart.referentiel_id)?.nom || '—'}</TableCell>
                      <TableCell>{controles.find(c => c.id === ecart.controle_id)?.activite_metier || '—'}</TableCell>
                      <TableCell className="text-xs max-w-xs truncate">{ecart.description}</TableCell>
                      <TableCell className="text-xs">{ecart.cause || '—'}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(ecart)}>✏️</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(ecart.id!)}>🗑️</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Actions */}
        <TabsContent value="actions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Actions correctives</h3>
            <Button onClick={openCreateModal}>+ Ajouter une action</Button>
          </div>

          {actions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune action corrective définie</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Date prévue</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="font-medium">{action.description}</TableCell>
                      <TableCell>
                        <Badge className={PRIORITE_COLORS[action.priorite]}>{action.priorite}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUT_ACTION_COLORS[action.statut]}>{action.statut}</Badge>
                      </TableCell>
                      <TableCell>{action.responsable_text || '—'}</TableCell>
                      <TableCell>{action.date_prevue ? new Date(action.date_prevue).toLocaleDateString('fr-FR') : '—'}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(action)}>✏️</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(action.id!)}>🗑️</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Plan de traitement */}
        <TabsContent value="plan" className="space-y-4">
          <div>
            <h3 className="font-semibold mb-4">Plan de traitement du risque</h3>
            {planTraitement ? (
              <Card>
                <CardHeader>
                  <CardTitle>Vue consolidée</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <div className="text-2xl font-bold text-gray-900">{planTraitement.stats.total}</div>
                      <div className="text-sm text-gray-600">Total écarts</div>
                    </div>
                    <div className="text-center p-4 bg-rose-50 rounded">
                      <div className="text-2xl font-bold text-rose-600">{planTraitement.stats.critiques_a_30j}</div>
                      <div className="text-sm text-gray-600">Critiques à 30j</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded">
                      <div className="text-2xl font-bold text-orange-600">{planTraitement.stats.haute_priorite}</div>
                      <div className="text-sm text-gray-600">Haute priorité</div>
                    </div>
                    <div className="text-center p-4 bg-emerald-50 rounded">
                      <div className="text-2xl font-bold text-emerald-600">{planTraitement.stats.terminees}</div>
                      <div className="text-sm text-gray-600">Terminées</div>
                    </div>
                  </div>

                  {/* Tableau consolidé */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Domaine</TableHead>
                        <TableHead>Écart / Action</TableHead>
                        <TableHead>Priorité</TableHead>
                        <TableHead>Responsable</TableHead>
                        <TableHead>Échéance</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planTraitement.ecarts.map((ecart) => {
                        const action = planTraitement.actions_correctives.find(a => a.ecart_id === ecart.id);
                        return (
                          <TableRow key={ecart.id}>
                            <TableCell className="font-mono text-xs">EC-{String(ecart.numero).padStart(2, '0')}</TableCell>
                            <TableCell>
                              <Badge className={DOMAINE_COLORS[ecart.domaine].bg + ' ' + DOMAINE_COLORS[ecart.domaine].text}>
                                {DOMAINE_LABELS[ecart.domaine]}
                              </Badge>
                            </TableCell>
                            <TableCell>{action ? action.description : ecart.description}</TableCell>
                            <TableCell>
                              {action ? (
                                <Badge className={PRIORITE_COLORS[action.priorite]}>{action.priorite}</Badge>
                              ) : '—'}
                            </TableCell>
                            <TableCell>{action?.responsable_text || '—'}</TableCell>
                            <TableCell>{action?.date_prevue ? new Date(action.date_prevue).toLocaleDateString('fr-FR') : '—'}</TableCell>
                            <TableCell>
                              {action ? (
                                <Badge className={STATUT_ACTION_COLORS[action.statut]}>{action.statut}</Badge>
                              ) : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <p className="text-gray-500 text-center py-8">Aucune donnée de plan de traitement disponible</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de création/édition */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Modifier' : 'Ajouter'} {activeTab === 'referentiels' && 'un référentiel'}
              {activeTab === 'controles' && 'un contrôle'}
              {activeTab === 'ecarts' && 'un écart'}
              {activeTab === 'actions' && 'une action'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {activeTab === 'referentiels' && (
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
                  <Textarea
                    value={newItem.description || ''}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
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
            {activeTab === 'controles' && (
              <>
                <div>
                  <Label>Référentiel *</Label>
                  <Select
                    value={newItem.referentiel_id || ''}
                    onValueChange={(value) => setNewItem({ ...newItem, referentiel_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {referentiels.map((ref) => (
                        <SelectItem key={ref.id} value={ref.id!}>{ref.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Activité métier *</Label>
                  <Input
                    value={newItem.activite_metier || ''}
                    onChange={(e) => setNewItem({ ...newItem, activite_metier: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Domaine</Label>
                  <Select
                    value={newItem.domaine || ''}
                    onValueChange={(value) => setNewItem({ ...newItem, domaine: value as DomaineMaturite })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOMAINE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            {activeTab === 'ecarts' && (
              <>
                <div>
                  <Label>Domaine *</Label>
                  <Select
                    value={newItem.domaine || ''}
                    onValueChange={(value) => setNewItem({ ...newItem, domaine: value as DomaineMaturite })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOMAINE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description *</Label>
                  <Textarea
                    value={newItem.description || ''}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Cause</Label>
                  <Textarea
                    value={newItem.cause || ''}
                    onChange={(e) => setNewItem({ ...newItem, cause: e.target.value })}
                    rows={2}
                  />
                </div>
              </>
            )}
            {activeTab === 'actions' && (
              <>
                <div>
                  <Label>Description *</Label>
                  <Textarea
                    value={newItem.description || ''}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Priorité</Label>
                  <Select
                    value={newItem.priorite || 'MOYENNE'}
                    onValueChange={(value) => setNewItem({ ...newItem, priorite: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FAIBLE">Faible</SelectItem>
                      <SelectItem value="MOYENNE">Moyenne</SelectItem>
                      <SelectItem value="HAUTE">Haute</SelectItem>
                      <SelectItem value="CRITIQUE">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select
                    value={newItem.statut || 'A_FAIRE'}
                    onValueChange={(value) => setNewItem({ ...newItem, statut: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A_FAIRE">À faire</SelectItem>
                      <SelectItem value="EN_COURS">En cours</SelectItem>
                      <SelectItem value="FAIT">Fait</SelectItem>
                      <SelectItem value="REPORTE">Reporté</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date prévue</Label>
                  <Input
                    type="date"
                    value={newItem.date_prevue?.split('T')[0] || ''}
                    onChange={(e) => setNewItem({ ...newItem, date_prevue: e.target.value })}
                  />
                </div>
              </>
            )}
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Annuler</Button>
              <Button onClick={editingItem ? handleUpdate : handleCreate}>
                {editingItem ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}