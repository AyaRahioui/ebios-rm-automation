import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { projectsApi, Project, ProjectCreate } from '../../api/projects';
import apiClient from '../../api/client';
import { DataTable, DataTableAction, DataTableColumn } from '../../components/ui/DataTable';
import { useAuth } from '../../store/authContext';


const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createNom, setCreateNom] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createDomaine, setCreateDomaine] = useState('');
  const [createStatut, setCreateStatut] = useState<string>('BROUILLON');
  const [createMethodeCotation, setCreateMethodeCotation] = useState<'EBIOS_RM_STANDARD' | 'PERSONNALISEE'>('EBIOS_RM_STANDARD');
  const [echelleFile, setEchelleFile] = useState<File | null>(null);
  const [echellePreview, setEchellePreview] = useState<any>(null);
  const [notifyConsultants, setNotifyConsultants] = useState(true);

  const [clientQuery, setClientQuery] = useState('');
  const clientDebounceRef = useRef<number | null>(null);
  const clientFieldRef = useRef<HTMLDivElement | null>(null);



  const [clientOptions, setClientOptions] = useState<{ id: string; email: string; first_name: string; last_name: string }[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [createClientId, setCreateClientId] = useState<string>('');

  const [consultantQuery, setConsultantQuery] = useState('');
  const consultantDebounceRef = useRef<number | null>(null);
  const consultantFieldRef = useRef<HTMLDivElement | null>(null);

  const [consultantOptions, setConsultantOptions] = useState<{ id: string; email: string; first_name: string; last_name: string }[]>([]);
  const [consultantLoading, setConsultantLoading] = useState(false);
  const [createConsultantIds, setCreateConsultantIds] = useState<string[]>([]);


  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [editNom, setEditNom] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDomaine, setEditDomaine] = useState('');
  const [editStatut, setEditStatut] = useState<string>('BROUILLON');
  const [editMethodeCotation, setEditMethodeCotation] = useState<string>('EBIOS RM standard 4 niveaux');


  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await projectsApi.list({ page: 1, page_size: 100, search: undefined, statut: undefined });
      setProjects(data.projects || []);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Impossible de charger les projets.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    if (isCreateOpen) {
      void loadClients('');
      void loadConsultants('');
    }

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;

      const clickedInsideClient = !!clientFieldRef.current && clientFieldRef.current.contains(target);
      const clickedInsideConsultant = !!consultantFieldRef.current && consultantFieldRef.current.contains(target);

      if (!clickedInsideClient) {
        setClientQuery('');
        setClientOptions([]);
      }

      if (!clickedInsideConsultant) {
        setConsultantQuery('');
        setConsultantOptions([]);
        // Keep selected consultants in chips; only close dropdown visibility/state.
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateOpen]);


  const onCreate = () => {
    setIsCreateOpen(true);
    setCreateStep(1);
    // Reset form
    setCreateNom('');
    setCreateDescription('');
    setCreateDomaine('');
    setCreateStatut('BROUILLON');
    setCreateMethodeCotation('EBIOS_RM_STANDARD');
    setEchelleFile(null);
    setEchellePreview(null);
    setCreateClientId('');
    setCreateConsultantIds([]);
    setNotifyConsultants(true);
  };

  const handleEchelleFileUpload = async (file: File) => {
    setEchelleFile(file);
    // TODO: Appeler l'endpoint d'extraction pour prévisualiser l'échelle
    // Pour l'instant, on simule
    setEchellePreview({
      niveaux: [
        { niveau: 1, code: 'G1', libelle: 'Mineur', couleur: '#10B981' },
        { niveau: 2, code: 'G2', libelle: 'Modéré', couleur: '#FACC15' },
        { niveau: 3, code: 'G3', libelle: 'Majeur', couleur: '#F97316' },
        { niveau: 4, code: 'G4', libelle: 'Critique', couleur: '#DC2626' },
      ]
    });
  };

  const loadClients = async (q: string) => {
    try {
      setClientLoading(true);
      const res = await apiClient.get('/admin/users', {
        params: {
          role: 'CLIENT',
          search: q || undefined,
          page: 1,
          page_size: 20,
        },
      });
                    setClientOptions(res.data.users || []);

    } catch (error) {
      toast.error('Impossible de charger les clients.');
      console.error(error);
    } finally {
      setClientLoading(false);
    }
  };

  const loadConsultants = async (q: string) => {
    try {
      setConsultantLoading(true);
      const res = await apiClient.get('/admin/users', {
        params: {
          role: 'CONSULTANT',
          search: q || undefined,
          page: 1,
          page_size: 50,
        },
      });
      setConsultantOptions(res.data.users || []);
    } catch (error) {
      toast.error('Impossible de charger les consultants.');
      console.error(error);
    } finally {
      setConsultantLoading(false);
    }
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (createStep === 1) {
      // Validation étape 1
      if (!createNom.trim()) {
        toast.error('Le nom du projet est requis');
        return;
      }
      if (createMethodeCotation === 'PERSONNALISEE' && !echelleFile) {
        toast.error('Veuillez uploader un fichier Excel pour l\'échelle personnalisée');
        return;
      }
      setCreateStep(2);
      return;
    }

    // Étape 2 - Validation finale
    if (!createClientId) {
      toast.error('Sélectionnez un client');
      return;
    }
    if (createConsultantIds.length === 0) {
      toast.error('Sélectionnez au moins un consultant');
      return;
    }

    try {
      setIsCreating(true);
      const payload: ProjectCreate = {
        nom: createNom.trim(),
        description: createDescription.trim() ? createDescription.trim() : null,
        domaine: createDomaine.trim() ? createDomaine.trim() : null,
        statut: createStatut,
        client_id: createClientId,
        consultant_ids: createConsultantIds,
      };

      await projectsApi.create(payload);

      // Si échelle personnalisée, uploader le fichier
      if (createMethodeCotation === 'PERSONNALISEE' && echelleFile) {
        const formData = new FormData();
        formData.append('file', echelleFile);
        // TODO: Appeler l'endpoint d'upload d'échelle
        // await apiClient.post(`/projets/${newProjectId}/atelier1/echelle-gravite/import`, formData);
      }

      await loadProjects();
      toast.success('Projet créé avec succès');
      setIsCreateOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Impossible de créer le projet');
    } finally {
      setIsCreating(false);
    }
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setEditNom(p.nom ?? '');
    setEditDescription(p.description ?? '');
    setEditDomaine(p.domaine ?? '');
    setEditStatut(p.statut ?? 'BROUILLON');
    setEditMethodeCotation(p.methode_cotation ?? 'EBIOS RM standard 4 niveaux');
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingProject(null);
    setIsEditing(false);
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!editNom.trim()) return;

    try {
      setIsEditing(true);
      await projectsApi.update(editingProject.id, {
        nom: editNom.trim(),
        description: editDescription.trim() ? editDescription.trim() : null,
        domaine: editDomaine.trim() ? editDomaine.trim() : null,
        statut: editStatut,
        methode_cotation: editMethodeCotation,
      });
      await loadProjects();
      toast.success('Projet mis à jour.');
      closeEdit();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Impossible de mettre à jour le projet.');
      setIsEditing(false);
    }
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const openDelete = (p: Project) => {
    setDeletingProject(p);
    setDeleteOpen(true);
  };

  const cancelDelete = () => {
    setDeleteOpen(false);
    setDeletingProject(null);
    setDeleteSaving(false);
  };

  const submitDelete = async () => {
    if (!deletingProject) return;
    try {
      setDeleteSaving(true);
      await projectsApi.delete(deletingProject.id);
      await loadProjects();
      toast.success('Projet supprimé.');
      setDeleteOpen(false);
      setDeletingProject(null);
      setDeleteSaving(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Impossible de supprimer le projet.');
      setDeleteSaving(false);
    }
  };

  const columns: DataTableColumn<Project>[] = useMemo(
    () => [
      {
        key: 'nom',
        header: 'Nom',
        render: (p) => <span className="font-medium">{p.nom}</span>,
      },
      {
        key: 'description',
        header: 'Description',
        render: (p) => (
          <span className="text-muted-foreground">{p.description ? p.description : '—'}</span>
        ),
      },
      {
        key: 'statut',
        header: 'Statut',
        render: (p) => <span className="text-muted-foreground">{p.statut}</span>,
      },

      {
        key: 'created_at',
        header: 'Créé le',
        render: (p) => <span className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>,
      },
    ],
    [],
  );

  const actions: DataTableAction<Project>[] = useMemo(
    () => {
      const baseActions: DataTableAction<Project>[] = [
        {
          key: 'view',
          label: 'Voir',
          icon: (
            <span aria-hidden className="inline-flex items-center justify-center text-muted-foreground">
              👁️
            </span>
          ),
          onClick: (p) => {
            navigate(`/projects/${p.id}/atelier-1`);
          },
        },
      ];

      // Only add edit and delete actions for non-client users
      if (user?.role !== 'CLIENT') {
        baseActions.push(
          {
            key: 'edit',
            label: 'Modifier',
            icon: (
              <span aria-hidden className="inline-flex items-center justify-center text-muted-foreground">
                ✏️
              </span>
            ),
            onClick: (p) => {
              openEdit(p);
            },
          },
          {
            key: 'delete',
            label: 'Supprimer',
            icon: (
              <span aria-hidden className="inline-flex items-center justify-center text-destructive">
                🗑️
              </span>
            ),
            onClick: (p) => {
              openDelete(p);
            },
          }
        );
      }

      return baseActions;
    },
    [navigate, user?.role],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2f54eb]">Projets</h1>
          <p className="text-muted-foreground">Gérez vos projets EBIOS RM</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        {isLoading ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : (
          <DataTable
            title=""
            description=""
            rowKey={(p) => p.id}
            rows={projects}
            columns={columns}
            actions={actions}
            columnsStorageKey="columns-projects-table"
            onCreate={user?.role !== 'CLIENT' ? onCreate : undefined}
            pageSizeOptions={[10, 20, 50]}
            initialPageSize={10}
            initialPage={1}
            footerLeftText={({ from, to, total }) => `Affichage de ${from} à ${to} sur ${total}`}
          />
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="w-full max-w-2xl space-y-6 rounded-lg bg-card p-6 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Nouveau projet</h2>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${createStep === 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>1</div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${createStep === 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>2</div>
              </div>
            </div>

            {createStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom du projet *</label>
                  <input
                    autoFocus
                    required
                    value={createNom}
                    onChange={(event) => setCreateNom(event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    placeholder="Ex: Audit sécurité SI 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={createDescription}
                    onChange={(event) => setCreateDescription(event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    rows={3}
                    placeholder="Description du projet..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Domaine d'activité</label>
                  <input
                    value={createDomaine}
                    onChange={(event) => setCreateDomaine(event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    placeholder="Ex: Finance, Santé, Industrie..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Méthode de cotation</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="methode"
                        value="EBIOS_RM_STANDARD"
                        checked={createMethodeCotation === 'EBIOS_RM_STANDARD'}
                        onChange={(e) => setCreateMethodeCotation(e.target.value as 'EBIOS_RM_STANDARD' | 'PERSONNALISEE')}
                        className="w-4 h-4"
                      />
                      <span>EBIOS RM standard (5 niveaux G1-G5)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="methode"
                        value="PERSONNALISEE"
                        checked={createMethodeCotation === 'PERSONNALISEE'}
                        onChange={(e) => setCreateMethodeCotation(e.target.value as 'EBIOS_RM_STANDARD' | 'PERSONNALISEE')}
                        className="w-4 h-4"
                      />
                      <span>Personnalisée (fichier client)</span>
                    </label>
                  </div>
                </div>

                {createMethodeCotation === 'PERSONNALISEE' && (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleEchelleFileUpload(file);
                      }}
                      className="hidden"
                      id="echelle-file"
                    />
                    <label htmlFor="echelle-file" className="cursor-pointer">
                      <div className="text-4xl mb-2">📄</div>
                      <p className="text-sm font-medium">Cliquez pour uploader le fichier Excel</p>
                      <p className="text-xs text-muted-foreground">Format .xlsx ou .xls</p>
                    </label>
                    {echelleFile && (
                      <div className="mt-4 p-3 bg-accent rounded-md">
                        <p className="text-sm font-medium">Fichier sélectionné : {echelleFile.name}</p>
                        {echellePreview && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Échelle détectée : {echellePreview.niveaux?.length || 0} niveaux
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-md border border-border px-4 py-2"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            )}

            {createStep === 2 && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-800">
                    <strong>Étape 2 :</strong> Sélectionnez le client et les consultants pour ce projet.
                  </p>
                </div>

                {/* Client */}
                <div ref={clientFieldRef} className="space-y-1">
                  <label className="block text-sm font-medium">Client *</label>
                  <input
                    value={clientQuery}
                    placeholder="Rechercher un client (nom/email)…"
                    onChange={(e) => {
                      const v = e.target.value;
                      setClientQuery(v);
                      if (clientDebounceRef.current) window.clearTimeout(clientDebounceRef.current);
                      if (!v.trim()) {
                        setClientQuery('');
                        setClientOptions([]);
                        setCreateClientId('');
                        return;
                      }
                      clientDebounceRef.current = window.setTimeout(() => void loadClients(v), 300);
                    }}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                  />
                  {clientLoading ? (
                    <div className="text-xs text-muted-foreground">Chargement…</div>
                  ) : clientOptions.length > 0 && clientQuery.trim() ? (
                    <div className="mt-2 max-h-32 overflow-auto rounded-md border border-border bg-background">
                      {clientOptions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-accent/30 ${createClientId === c.id ? 'bg-accent/30' : ''}`}
                          onClick={() => { setCreateClientId(c.id); setClientQuery(''); setClientOptions([]); }}
                        >
                          <div className="font-medium">{c.first_name} {c.last_name}</div>
                          <div className="text-xs text-muted-foreground">{c.email}</div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {createClientId && (
                    <div className="text-xs text-muted-foreground">
                      Client sélectionné : {clientOptions.find((o) => o.id === createClientId)?.email || createClientId}
                    </div>
                  )}
                </div>

                {/* Consultants */}
                <div ref={consultantFieldRef} className="space-y-2">
                  <label className="block text-sm font-medium">Consultants *</label>
                  <input
                    value={consultantQuery}
                    placeholder="Rechercher des consultants (nom/email)…"
                    onChange={(e) => {
                      const v = e.target.value;
                      setConsultantQuery(v);
                      if (consultantDebounceRef.current) window.clearTimeout(consultantDebounceRef.current);
                      if (!v.trim()) { setConsultantOptions([]); return; }
                      consultantDebounceRef.current = window.setTimeout(() => void loadConsultants(v), 300);
                    }}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                  />
                  {consultantLoading ? (
                    <div className="text-xs text-muted-foreground">Chargement…</div>
                  ) : consultantOptions.length > 0 && consultantQuery.trim() ? (
                    <div className="mt-2 max-h-32 overflow-auto rounded-md border border-border bg-background">
                      {consultantOptions.map((c) => {
                        const already = createConsultantIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            disabled={already}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-accent/30 ${already ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => { if (!already) setCreateConsultantIds((prev) => [...prev, c.id]); }}
                          >
                            <div className="font-medium">{c.first_name} {c.last_name}</div>
                            <div className="text-xs text-muted-foreground">{c.email}</div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {createConsultantIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {createConsultantIds.map((id) => {
                        const u = consultantOptions.find((o) => o.id === id);
                        return (
                          <span key={id} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs">
                            <span className="text-muted-foreground">{u ? `${u.first_name} ${u.last_name}` : id}</span>
                            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setCreateConsultantIds((prev) => prev.filter((x) => x !== id))}>×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyConsultants}
                    onChange={(e) => setNotifyConsultants(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Notifier immédiatement les consultants</span>
                </label>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateStep(1)}
                    className="rounded-md border border-border px-4 py-2"
                  >
                    ← Précédent
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-md border border-border px-4 py-2"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
                  >
                    {isCreating ? 'Création…' : 'Créer le projet'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {editOpen && editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={(e) => {
              void submitEdit(e);
            }}
            className="w-full max-w-md space-y-4 rounded-lg bg-card p-6 shadow-lg"
          >
            <h2 className="text-xl font-semibold">Modifier le projet</h2>

            <label className="block text-sm font-medium">
              Nom *
              <input
                autoFocus
                required
                value={editNom}
                onChange={(event) => setEditNom(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>

            <label className="block text-sm font-medium">
              Description
              <input
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>

            <label className="block text-sm font-medium">
              Domaine
              <input
                value={editDomaine}
                onChange={(event) => setEditDomaine(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>

            <label className="block text-sm font-medium">
              Statut
              <select
                value={editStatut}
                onChange={(event) => setEditStatut(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="BROUILLON">BROUILLON</option>
                <option value="EN_COURS">EN_COURS</option>
                <option value="EN_PAUSE">EN_PAUSE</option>
                <option value="TERMINE">TERMINE</option>
                <option value="ARCHIVE">ARCHIVE</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Méthode de cotation
              <input
                value={editMethodeCotation}
                onChange={(event) => setEditMethodeCotation(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => closeEdit()}
                className="rounded-md border border-border px-4 py-2"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isEditing}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
              >
                {isEditing ? 'Mise à jour…' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteOpen && deletingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg bg-card p-6 shadow-lg">
            <h2 className="text-xl font-semibold">Supprimer le projet</h2>
            <div className="text-sm text-muted-foreground">
              Confirmer la suppression de <span className="font-medium">{deletingProject.nom}</span>. Cette action est irréversible.
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => cancelDelete()}
                className="rounded-md border border-border px-4 py-2"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleteSaving}
                onClick={() => {
                  void submitDelete();
                }}
                className="rounded-md bg-destructive px-4 py-2 text-destructive-foreground disabled:opacity-50"
              >
                {deleteSaving ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;

