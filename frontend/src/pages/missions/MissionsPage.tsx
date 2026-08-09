import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import apiClient from '../../api/client';
import { Button } from '../../components/ui/button';

import { Project } from '../../api/projects';

type MissionMembership = {
  id: string;
  status: string;
  invited_at: string;
  responded_at: string | null;
};

type Mission = {
  project: Project & { organization_id?: string | null };
  membership: MissionMembership;
};

const MissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMissions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/missions');
      const data = res.data;
      const missionsArray: Mission[] = Array.isArray(data) ? data : (data?.missions ?? []);
      setMissions(missionsArray || []);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = detail || e?.message || 'Impossible de charger vos missions.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (projectId: string) => {
    try {
      await apiClient.post(`/missions/projects/${projectId}/accept`);
      toast.success('Mission acceptée');
      await loadMissions();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = detail || e?.message || 'Impossible d\'accepter la mission.';
      toast.error(msg);
    }
  };

  const handleDecline = async (projectId: string) => {
    try {
      await apiClient.post(`/missions/projects/${projectId}/decline`);
      toast.success('Mission refusée');
      await loadMissions();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = detail || e?.message || 'Impossible de refuser la mission.';
      toast.error(msg);
    }
  };

  useEffect(() => {
    void loadMissions();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#2f54eb]">Mes missions</h1>
        <p className="text-muted-foreground">Missions des projets où vous êtes consultant</p>
      </div>

      {loading ? (
        <div className="bg-card rounded-lg border border-border p-6 text-muted-foreground">
          Chargement…
        </div>
      ) : missions.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-muted-foreground">Aucune mission en attente pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {missions.map((m) => (
            <div
              key={m.membership.id}
              className="bg-card rounded-lg border border-border p-4 flex items-start justify-between gap-4 hover:border-blue-300 transition-colors cursor-pointer"
              onClick={() => m.membership.status === 'ACCEPTED' && navigate(`/projects/${m.project.id}/atelier-1`)}
            >
              <div className="flex-1">
                <div className="font-semibold text-lg">{m.project.nom}</div>
                <div className="text-sm text-muted-foreground">
                  Chef de projet : {m.project.chef_de_projet_name || m.project.chef_de_projet_id}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Date envoyée : {m.membership.invited_at ? new Date(m.membership.invited_at).toLocaleDateString() : '—'}
                </div>
                <div className="text-xs mt-1">
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                    m.membership.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    m.membership.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {m.membership.status === 'PENDING' ? 'En attente' :
                     m.membership.status === 'ACCEPTED' ? 'Acceptée' : 'Refusée'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
                {m.membership.status === 'PENDING' ? (
                  <>
                    <Button
                      type="button"
                      onClick={() => handleAccept(m.project.id)}
                      size="sm"
                    >
                      Accepter
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDecline(m.project.id)}
                      size="sm"
                    >
                      Refuser
                    </Button>
                  </>
                ) : m.membership.status === 'ACCEPTED' ? (
                  <Button
                    type="button"
                    onClick={() => navigate(`/projects/${m.project.id}/atelier1`)}
                    size="sm"
                  >
                    Accéder à l'Atelier 1
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" disabled size="sm">
                    Refusée
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MissionsPage;

