import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import apiClient from '@/api/client';
import { useAuth } from '@/store/authContext';

const ALL_ACTIVITES = [
  'A1.1', 'A1.2', 'A2_VALIDATION', 'A2_BS',
  'A1.3', 'A3_G45_DG',
  'A1.4', 'A4_SOCLE', 'A4_VERROUILLAGE',
];

const ACTIVITE_LABELS: Record<string, string> = {
  'A1.1': 'Cadrage de l\'étude',
  'A1.2': 'Identification des VM',
  'A2_VALIDATION': 'Validation VM',
  'A2_BS': 'Identification des BS',
  'A1.3': 'Identification des ER',
  'A3_G45_DG': 'Validation G4/G5',
  'A1.4': 'Évaluation du socle',
  'A4_SOCLE': 'Validation socle',
  'A4_VERROUILLAGE': 'Verrouillage Atelier 1',
};

const ACTIVITE_PDF_REFS: Record<string, string> = {
  'A1.1': 'PDF p. 55-56',
  'A1.2': 'PDF p. 57-58',
  'A2_VALIDATION': 'PDF p. 67',
  'A2_BS': 'Fiche méthode n°2',
  'A1.3': 'PDF p. 60-67',
  'A3_G45_DG': 'PDF p. 67 (DG)',
  'A1.4': 'PDF p. 68-73',
  'A4_SOCLE': 'PDF p. 70',
  'A4_VERROUILLAGE': 'PDF p. 47',
};

const ROLE_COLORS: Record<string, string> = {
  'R': 'bg-blue-100 text-blue-800',
  'A': 'bg-emerald-100 text-emerald-800',
  'C': 'bg-slate-100 text-slate-800',
  'I': 'bg-amber-100 text-amber-800',
  '-': 'bg-gray-100 text-gray-800',
};

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

interface AuditEntry {
  id: string;
  project_id: string;
  activite_code: string;
  object_type?: string;
  object_id?: string;
  user_id: string;
  user_nom: string;
  action: string;
  role_raci: string;
  details?: string;
  timestamp: string;
}

export default function GouvernancePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [editingMode, setEditingMode] = useState(false);
  const [draftRaci, setDraftRaci] = useState<Record<string, string>>({});
  
  const isChefProjet = user?.role === 'CHEF_PROJET';

  // Fetch RACI matrix
  const { data: raciAssignments } = useQuery({
    queryKey: ['raci-matrix', projectId],
    queryFn: async (): Promise<RACIAssignment[]> => {
      const res = await apiClient.get<RACIAssignment[]>(`/raci/projects/${projectId}/matrix`);
      return res.data;
    },
    enabled: !!projectId,
  });

  // Fetch project team
  const { data: team } = useQuery({
    queryKey: ['project-team-v2', projectId],
    queryFn: async (): Promise<{ chef_projet: User; consultants: User[]; client: User | null; all_members: User[] }> => {
      const res = await apiClient.get(`/raci/projects/${projectId}/team`);
      return res.data;
    },
    enabled: !!projectId,
  });

  // Fetch audit log
  const { data: auditLog } = useQuery({
    queryKey: ['audit-log', projectId],
    queryFn: async (): Promise<AuditEntry[]> => {
      const res = await apiClient.get(`/audit/projects/${projectId}/log?limit=50`);
      return res.data;
    },
    enabled: !!projectId,
  });

  // Build draft RACI from current assignments
  const initializeDraft = () => {
    if (!raciAssignments || !team) return;
    const draft: Record<string, string> = {};
    raciAssignments.forEach((assignment) => {
      draft[`${assignment.activite_code}__${assignment.user_id}`] = assignment.role_raci;
    });
    setDraftRaci(draft);
  };

  // Initialize draft when data loads
  if (raciAssignments && team && Object.keys(draftRaci).length === 0) {
    initializeDraft();
  }

  const setCell = (activiteCode: string, userId: string, value: string) => {
    // Seul le chef de projet peut modifier la matrice RACI
    if (!isChefProjet) {
      alert('Seul le chef de projet peut modifier la matrice RACI');
      return;
    }
    setDraftRaci((prev) => ({
      ...prev,
      [`${activiteCode}__${userId}`]: value,
    }));
  };

  const validationErrors = (() => {
    const errors: Record<string, string | null> = {};
    ALL_ACTIVITES.forEach((act) => {
      const aCount = Object.entries(draftRaci)
        .filter(([k, v]) => k.startsWith(`${act}__`) && v === 'A')
        .length;
      if (aCount === 0) {
        errors[act] = 'Aucune Autorité (A) — au moins 1 requise';
      } else if (aCount > 1) {
        errors[act] = `${aCount} Autorités détectées — 1 seule autorisée`;
      } else {
        errors[act] = null;
      }
    });
    return errors;
  })();

  const handleSaveRaci = async () => {
    // Seul le chef de projet peut sauvegarder la matrice RACI
    if (!isChefProjet) {
      alert('Seul le chef de projet peut modifier la matrice RACI');
      return;
    }
    if (!team) return;
    
    
    // Check for validation errors
    const hasErrors = Object.values(validationErrors).some((e) => e !== null);
    if (hasErrors) {
      alert('Corrigez les erreurs de validation avant de sauvegarder');
      return;
    }

    const entries = Object.entries(draftRaci).map(([key, role]) => {
      const [activiteCode, userId] = key.split('__');
      return {
        activite_code: activiteCode,
        user_id: userId,
        role_raci: role,
      };
    });

    try {
      const res = await apiClient.put(`/raci/projects/${projectId}/matrix`, { entries });
      setEditingMode(false);
      // Refresh queries
      window.location.reload();
    } catch (error) {
      console.error('Error saving RACI:', error);
      alert('Erreur lors de la sauvegarde de la matrice RACI');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      SUBMITTED: 'bg-blue-100 text-blue-800',
      VALIDATED: 'bg-emerald-100 text-emerald-800',
      REJECTED: 'bg-red-100 text-red-800',
      LOCKED: 'bg-purple-100 text-purple-800',
      RACI_EDITED: 'bg-amber-100 text-amber-800',
    };
    return (
      <Badge className={colors[action] || 'bg-gray-100 text-gray-800'}>
        {action}
      </Badge>
    );
  };

  if (!team) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gouvernance du projet</h1>
        <p className="text-gray-600">Gérez la matrice RACI et le workflow des activités EBIOS RM</p>
      </div>

      <Tabs defaultValue="equipe" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="equipe">Équipe</TabsTrigger>
          <TabsTrigger value="matrix">Matrice RACI</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        {/* Équipe Tab */}
        <TabsContent value="equipe">
          <Card>
            <CardHeader>
              <CardTitle>Équipe du projet</CardTitle>
              <CardDescription>Le RACI s'applique uniquement à ces personnes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Chef de projet */}
              <div>
                <label className="text-sm font-medium mb-2 block">Chef de projet</label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Badge className="bg-purple-100 text-purple-800">CHEF_PROJET</Badge>
                  <span className="font-medium">{team.chef_projet.first_name} {team.chef_projet.last_name}</span>
                  <span className="text-sm text-gray-500">{team.chef_projet.email}</span>
                  {team.chef_projet.job_title && (
                    <Badge variant="outline" className="ml-2">{team.chef_projet.job_title}</Badge>
                  )}
                </div>
              </div>

              {/* Client */}
              <div>
                <label className="text-sm font-medium mb-2 block">Client</label>
                {team.client ? (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Badge className="bg-emerald-100 text-emerald-800">CLIENT</Badge>
                    <span className="font-medium">{team.client.first_name} {team.client.last_name}</span>
                    <span className="text-sm text-gray-500">{team.client.email}</span>
                    {team.client.job_title && (
                      <Badge variant="outline" className="ml-2">{team.client.job_title}</Badge>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg text-gray-500 italic">
                    Aucun client assigné
                  </div>
                )}
              </div>

              {/* Consultants */}
              <div>
                <label className="text-sm font-medium mb-2 block">Consultants ({team.consultants.length})</label>
                <div className="space-y-2">
                  {team.consultants.map((consultant) => (
                    <div key={consultant.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Badge className="bg-blue-100 text-blue-800">CONSULTANT</Badge>
                      <span className="font-medium">{consultant.first_name} {consultant.last_name}</span>
                      <span className="text-sm text-gray-500">{consultant.email}</span>
                      {consultant.job_title && (
                        <Badge variant="outline" className="ml-2">{consultant.job_title}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Matrice RACI Tab */}
        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Matrice RACI</CardTitle>
                  <CardDescription>
                    9 sous-activités EBIOS RM × {team.all_members.length} membres de l'équipe
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {!isChefProjet && !editingMode && (
                    <Badge className="bg-slate-100 text-slate-600 text-xs self-center">
                      Lecture seule
                    </Badge>
                  )}
                  {editingMode ? (
                    <>
                      <Button variant="outline" onClick={() => {
                        setEditingMode(false);
                        initializeDraft();
                      }}>
                        Annuler
                      </Button>
                      <Button onClick={handleSaveRaci}>
                        💾 Sauvegarder
                      </Button>
                    </>
                  ) : (
                    isChefProjet && (
                      <Button onClick={() => setEditingMode(true)}>
                        ✏️ Modifier
                      </Button>
                    )
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 bg-amber-50 border-amber-200">
                <AlertDescription>
                  ⚠ Pour chaque activité, 1 et 1 seule personne peut avoir le rôle A (Autorité unique, PDF p. 67).
                </AlertDescription>
              </Alert>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 text-left border">Activité</th>
                      {team.all_members.map((user) => (
                        <th key={user.id} className="p-3 text-center border min-w-[100px]">
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
                  <tbody>
                    {ALL_ACTIVITES.map((act) => (
                      <tr
                        key={act}
                        className={validationErrors[act] ? 'bg-rose-50' : ''}
                      >
                        <td className="p-3 border">
                          <div className="font-mono text-sm">{act}</div>
                          <div className="text-sm font-medium">{ACTIVITE_LABELS[act]}</div>
                          <div className="text-xs text-gray-500">{ACTIVITE_PDF_REFS[act]}</div>
                          {act === 'A3_G45_DG' && (
                            <Badge variant="outline" className="mt-1 text-xs">⚠ G4/G5</Badge>
                          )}
                          {validationErrors[act] && (
                            <div className="text-xs text-red-600 mt-1">⚠ {validationErrors[act]}</div>
                          )}
                        </td>
                        {team.all_members.map((user) => {
                          const value = draftRaci[`${act}__${user.id}`] || '-';
                          return (
                            <td key={user.id} className="p-2 border text-center">
                              {editingMode ? (
                                <Select
                                  value={value}
                                  onValueChange={(v) => setCell(act, user.id, v)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="-">-</SelectItem>
                                    <SelectItem value="R">R</SelectItem>
                                    <SelectItem value="A">A</SelectItem>
                                    <SelectItem value="C">C</SelectItem>
                                    <SelectItem value="I">I</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge className={ROLE_COLORS[value] || ROLE_COLORS['-']}>
                                  {value}
                                </Badge>
                              )}
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
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Journal d'audit</CardTitle>
              <CardDescription>Les 50 dernières actions sur le projet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3 text-left border">Date</th>
                      <th className="p-3 text-left border">Activité</th>
                      <th className="p-3 text-left border">Objet</th>
                      <th className="p-3 text-left border">Utilisateur</th>
                      <th className="p-3 text-left border">Action</th>
                      <th className="p-3 text-left border">Rôle</th>
                      <th className="p-3 text-left border">Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog?.map((entry) => (
                      <tr key={entry.id}>
                        <td className="p-3 border text-sm">{formatDate(entry.timestamp)}</td>
                        <td className="p-3 border font-mono text-sm">{entry.activite_code}</td>
                        <td className="p-3 border">
                          {entry.object_type && <Badge variant="outline">{entry.object_type}</Badge>}
                        </td>
                        <td className="p-3 border">{entry.user_nom}</td>
                        <td className="p-3 border">{getActionBadge(entry.action)}</td>
                        <td className="p-3 border">
                          <Badge className={ROLE_COLORS[entry.role_raci] || ROLE_COLORS['-']}>
                            {entry.role_raci}
                          </Badge>
                        </td>
                        <td className="p-3 border text-xs text-gray-500">{entry.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
