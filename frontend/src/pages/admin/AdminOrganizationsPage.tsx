import React, { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTable, DataTableColumn } from '../../components/ui/DataTable';
import { Organization, organizationsApi } from '../../api/organizations';

const AdminOrganizationsPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');

  const loadOrganizations = async () => {
    try {
      setIsLoading(true);
      setOrganizations(await organizationsApi.list());
    } catch {
      toast.error('Impossible de charger les organisations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrganizations();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSaving(true);
      const organization = await organizationsApi.create({
        nom: name.trim(),
        secteur_activite: sector.trim() || undefined,
      });

      setOrganizations((current) =>
        [...current, organization].sort((a, b) => a.nom.localeCompare(b.nom)),
      );

      setName('');
      setSector('');
      setIsOpen(false);
      toast.success('Organisation créée.');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Impossible de créer l’organisation.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns: DataTableColumn<Organization>[] = [
    {
      key: 'nom',
      header: 'Nom',
      render: (o) => (
        <span className="text-sm font-medium">{o.nom}</span>
      ),
    },
    {
      key: 'secteur_activite',
      header: 'Secteur d’activité',
      render: (o) => (
        <span className="text-sm text-muted-foreground">{o.secteur_activite ?? '—'}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Créé le',
      render: (o) => (
        <span className="text-sm text-muted-foreground">
          {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
        </span>
      ),
    },
  ];

  const actions = [
    {
      key: 'view',
      label: 'Voir',
      icon: <span aria-hidden>👁</span>,
      onClick: (o: Organization) => toast.message(`Organisation: ${o.nom}`),
    },
    {
      key: 'edit',
      label: 'Éditer',
      icon: <span aria-hidden>✎</span>,
      onClick: (o: Organization) => toast.message(`Édition: ${o.nom} (placeholder)`),
    },
    {
      key: 'delete',
      label: 'Supprimer',
      icon: <span aria-hidden>🗑</span>,
      onClick: (o: Organization) => toast.message(`Suppression: ${o.nom} (placeholder)`),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
<h1 className="text-3xl font-bold text-[#2f54eb]">Organisations</h1>
          <p className="text-muted-foreground">Gérez les organisations clientes</p>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
        >
          Nouvelle organisation
        </button>
      </div>

      {isLoading ? (
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">Chargement…</div>
      ) : (
        <DataTable<Organization>
          columns={columns}
          rows={organizations}
          rowKey={(o) => o.id}
          getSearchText={(o) => `${o.nom} ${o.secteur_activite ?? ''}`}
          actions={actions}
          onCreate={() => setIsOpen(true)}
          columnsStorageKey="columns-organizations-table"
          footerLeftText={(meta) => `Affichage de ${meta.from} à ${meta.to} sur ${meta.total}`}
        />
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md space-y-4 rounded-lg bg-card p-6 shadow-lg"
          >
            <h2 className="text-xl font-semibold">Nouvelle organisation</h2>

            <label className="block text-sm font-medium">
              Nom
              <input
                autoFocus
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>

            <label className="block text-sm font-medium">
              Secteur d’activité{' '}
              <span className="text-muted-foreground">(facultatif)</span>
              <input
                value={sector}
                onChange={(event) => setSector(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-border px-4 py-2"
              >
                Annuler
              </button>
              <button
                disabled={isSaving}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
              >
                {isSaving ? 'Création…' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminOrganizationsPage;



