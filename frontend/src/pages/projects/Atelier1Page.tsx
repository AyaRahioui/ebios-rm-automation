import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { atelier1Api, Progression } from '../../api/atelier1';
import { projectsApi, Project } from '../../api/projects';
import { Button } from '../../components/ui/button';
import Activite1Form from '../../components/atelier1/Activite1Form';
import Activite2View from '../../components/atelier1/Activite2View';
import Activite3View from '../../components/atelier1/Activite3View';
import Activite4View from '../../components/atelier1/Activite4View';
import AtelierHeader, { ActiviteStep } from '../../components/atelier1/AtelierHeader';
import { useAuth } from '../../store/authContext';

export default function Atelier1Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('activite1');
  const [progression, setProgression] = useState<Progression | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgression();
    loadProject();
  }, [id]);

  const loadProgression = async () => {
    try {
      setLoading(true);
      const response = await atelier1Api.getProgression(id!);
      setProgression(response.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError("Vous n'avez pas accès à l'Atelier 1. Au moins un consultant doit avoir accepté la mission.");
      } else {
        setError("Erreur lors du chargement de la progression");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadProject = async () => {
    try {
      const response = await projectsApi.get(id!);
      setProject(response);
    } catch (err) {
      console.error('Error loading project:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button 
            onClick={() => navigate(`/projects/${id}`)}
            className="mt-4"
          >
            Retour au projet
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'activite1', label: "Définir le cadre de l'étude", statut: progression?.activite1_statut },
    { id: 'activite2', label: 'Définir le périmètre métier et technique', statut: progression?.activite2_statut },
    { id: 'activite3', label: 'Identifier les événements redoutés', statut: progression?.activite3_statut },
    { id: 'activite4', label: 'Déterminer le socle de sécurité', statut: progression?.activite4_statut },
  ];

  const activites: ActiviteStep[] = [
    { label: "Définir le cadre de l'étude", status: progression?.activite1_statut || 'NON_DEMARRE' },
    { label: 'Définir le périmètre métier et technique', status: progression?.activite2_statut || 'NON_DEMARRE' },
    { label: 'Identifier les événements redoutés', status: progression?.activite3_statut || 'NON_DEMARRE' },
    { label: 'Déterminer le socle de sécurité', status: progression?.activite4_statut || 'NON_DEMARRE' },
  ];

  const activeStepIndex = tabs.findIndex(tab => tab.id === activeTab);

  const handleStepClick = (index: number) => {
    setActiveTab(tabs[index].id);
  };

  const getActiviteProgression = (tabId: string): number => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return 0;
    
    switch (tab.statut) {
      case 'TERMINE': return 100;
      case 'EN_COURS': return 50;
      default: return 0;
    }
  };

  const consultantNom = user ? `${user.first_name} ${user.last_name}` : 'Consultant';
  const consultantRole = user?.role || 'CONSULTANT';

  return (
    <div className="min-h-screen bg-[#8ed3ff33]">
      {/* Sticky Header */}
      <AtelierHeader
        atelierName="Atelier 1"
        etudeNom={project?.nom || 'Étude'}
        consultantNom={consultantNom}
        consultantRole={consultantRole}
        activites={activites}
        activeStepIndex={activeStepIndex}
        onStepClick={handleStepClick}
      />

      {/* Content */}
      <div className="p-6">
        {/* Progression bar */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progression de l'activité {activeStepIndex + 1}
            </span>
            <span className="text-sm font-bold text-gray-900">
              {getActiviteProgression(activeTab)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getActiviteProgression(activeTab)}%` }}
            ></div>
          </div>
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'activite1' && (
            <div className="p-6">
              <Activite1Form
                projectId={id!}
                projectData={project ? {
                  nom: project.nom,
                  description: project.description || '',
                  domaine: project.domaine || '',
                  statut: project.statut,
                  methode_cotation: project.methode_cotation
                } : {
                  nom: 'Nom du projet',
                  description: 'Description du projet',
                  domaine: 'Domaine',
                  statut: 'EN_COURS',
                  methode_cotation: 'EBIOS RM standard 4 niveaux'
                }}
                onStatutChange={async (statut) => {
                  await atelier1Api.updateActivite1Statut(id!, statut);
                  loadProgression();
                }}
                currentStatut={progression?.activite1_statut || 'NON_DEMARRE'}
              />
            </div>
          )}

          {activeTab === 'activite2' && (
            <div className="p-6">
              <Activite2View
                projectId={id!}
                onStatutChange={async (statut) => {
                  await atelier1Api.updateActivite2Statut(id!, statut);
                  loadProgression();
                }}
                currentStatut={progression?.activite2_statut || 'NON_DEMARRE'}
              />
            </div>
          )}

          {activeTab === 'activite3' && (
            <div className="p-6">
              <Activite3View
                projectId={id!}
                onStatutChange={async (statut) => {
                  await atelier1Api.updateActivite3Statut(id!, statut);
                  loadProgression();
                }}
                currentStatut={progression?.activite3_statut || 'NON_DEMARRE'}
              />
            </div>
          )}

          {activeTab === 'activite4' && (
            <div className="p-6">
              <Activite4View
                projectId={id!}
                onStatutChange={async (statut) => {
                  await atelier1Api.updateActivite4Statut(id!, statut);
                  loadProgression();
                }}
                currentStatut={progression?.activite4_statut || 'NON_DEMARRE'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
