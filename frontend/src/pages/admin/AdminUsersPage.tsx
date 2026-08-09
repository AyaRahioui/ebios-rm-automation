import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { usersApi, User } from '../../api/users';
import { DataTable, DataTableColumn, DataTableAction } from '../../components/ui/DataTable';

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [role, setRole] = useState('CONSULTANT');

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editRole, setEditRole] = useState<User['role']>('CONSULTANT');
  const [editStatus, setEditStatus] = useState<User['status']>('INVITED');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const roleOptions = useMemo(
    () => ['ADMIN', 'CHEF_PROJET', 'CONSULTANT', 'CLIENT'] as User['role'][],
    [],
  );

  const statusOptions = useMemo(
    () => ['INVITED', 'ACTIVE', 'DISABLED'] as User['status'][],
    [],
  );


  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await usersApi.list();
      setUsers(data.users || []);
    } catch (error) {
      toast.error('Impossible de charger les utilisateurs.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    try {
      setIsSaving(true);
      const newUser = await usersApi.create({
        email: email.trim(),
        first_name: prenom.trim(),
        last_name: nom.trim(),
        role: role,
      });
      setUsers((current) => [...current, newUser].sort((a, b) => a.email.localeCompare(b.email)));
      setEmail('');
      setPrenom('');
      setNom('');
      setRole('CONSULTANT');
      setIsOpen(false);
      toast.success('Utilisateur créé.');
      if (newUser.activation_link) {
        toast.success(`Lien d'activation: ${newUser.activation_link}`, { duration: 10000 });
      } else {
        toast.message(`Email d'invitation envoyé à ${newUser.email}`);
      }

    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Impossible de créer l\'utilisateur.');
    } finally {
      setIsSaving(false);
    }
  };

  const onCreate = () => {
    setIsOpen(true);
  };

  const resetEditForm = () => {
    setEditingUser(null);
    setEditFirstName('');
    setEditLastName('');
    setEditRole('CONSULTANT');
    setEditStatus('INVITED');
    setEditOpen(false);
    setEditSaving(false);
  };

  const submitEdit = async () => {
    if (!editingUser) return;
    if (!editFirstName.trim() || !editLastName.trim()) {
      toast.error('Prénom et nom sont requis.');
      return;
    }

    try {
      setEditSaving(true);
      await usersApi.update(editingUser.id, {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        role: editRole,
        status: editStatus,
      });
      toast.success('Utilisateur mis à jour.');
      await loadUsers();
      resetEditForm();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Impossible de mettre à jour l\'utilisateur.');
      setEditSaving(false);
    }
  };

  const cancelDelete = () => {
    setDeleteOpen(false);
    setDeletingUser(null);
    setDeleteSaving(false);
  };


  const submitDelete = async () => {
    if (!deletingUser) return;
    try {
      setDeleteSaving(true);
      await usersApi.delete(deletingUser.id);
      toast.success('Utilisateur supprimé.');
      await loadUsers();
      setDeleteOpen(false);
      setDeletingUser(null);
      setDeleteSaving(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Impossible de supprimer l\'utilisateur.');
      setDeleteSaving(false);
    }
  };


  const columns: DataTableColumn<User>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (u) => <span className="font-medium">{u.email}</span>,
    },
    {
      key: 'name',
      header: 'Nom',
      render: (u) => (
        <span>
          {u.first_name} {u.last_name}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Rôle',
      render: (u) => <span className="text-muted-foreground">{u.role}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (u) => {
        const status = String(u.status ?? '');
        const isActive = status.toUpperCase() === 'ACTIVE';
        return (
          <span className={isActive ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
            {status}
          </span>
        );
      },
    },

  ];

  const actions: DataTableAction<User>[] = [
    {
      key: 'edit',
      label: 'Modifier',
      icon: (
        <span aria-hidden className="inline-flex items-center justify-center text-muted-foreground">
          ✏️
        </span>
      ),
      onClick: async (u) => {
        setEditingUser(u);
        setEditFirstName(u.first_name ?? '');
        setEditLastName(u.last_name ?? '');
        setEditRole(u.role);
        setEditStatus(u.status);
        setEditOpen(true);
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
      onClick: async (u) => {
        setDeletingUser(u);
        setDeleteOpen(true);
      },
    },
  ];



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#2f54eb' }}>
            Utilisateurs
          </h1>

          <p className="text-muted-foreground">Gérez les utilisateurs de la plateforme</p>
        </div>

      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        {isLoading ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground">Aucun utilisateur pour le moment.</p>
        ) : (
          // DataTable
          <DataTable
            title=""
            description=""
            rowKey={(u) => u.id}
            rows={users}
            columns={columns}
            actions={actions}
            columnsStorageKey="columns-users-table"
            onCreate={onCreate}
            pageSizeOptions={[10, 20, 50]}
            initialPageSize={10}
            initialPage={1}
            footerLeftText={({ from, to, total }) => `Affichage de ${from} à ${to} sur ${total}`}
          />
        )}
      </div>


      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-lg bg-card p-6 shadow-lg">
            <h2 className="text-xl font-semibold">Nouvel utilisateur</h2>

            <label className="block text-sm font-medium">
              Email *
              <input
                autoFocus
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>

            <label className="block text-sm font-medium">
              Prénom
              <input
                value={prenom}
                onChange={(event) => setPrenom(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>

            <label className="block text-sm font-medium">
              Nom
              <input
                value={nom}
                onChange={(event) => setNom(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>

            <label className="block text-sm font-medium">
              Rôle *
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="ADMIN">Admin</option>
                <option value="CONSULTANT">Consultant</option>
                <option value="CHEF_PROJET">Chef de projet</option>
                <option value="CLIENT">Client</option>
              </select>
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

      {editOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitEdit();
            }}
            className="w-full max-w-md space-y-4 rounded-lg bg-card p-6 shadow-lg"
          >
            <h2 className="text-xl font-semibold">Modifier l'utilisateur</h2>

            <div className="text-sm text-muted-foreground">{editingUser.email}</div>

            <label className="block text-sm font-medium">
              Prénom *
              <input
                autoFocus
                required
                value={editFirstName}
                onChange={(event) => setEditFirstName(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>

            <label className="block text-sm font-medium">
              Nom *
              <input
                required
                value={editLastName}
                onChange={(event) => setEditLastName(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>

            <label className="block text-sm font-medium">
              Rôle *
              <select
                value={editRole}
                onChange={(event) => setEditRole(event.target.value as User['role'])}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Statut *
              <select
                value={editStatus}
                onChange={(event) => setEditStatus(event.target.value as User['status'])}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => resetEditForm()}
                className="rounded-md border border-border px-4 py-2"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
              >
                {editSaving ? 'Mise à jour…' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteOpen && deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg bg-card p-6 shadow-lg">
            <h2 className="text-xl font-semibold">Supprimer l'utilisateur</h2>
            <div className="text-sm text-muted-foreground">
              Confirmer la suppression de <span className="font-medium">{deletingUser.email}</span>.
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

export default AdminUsersPage;
