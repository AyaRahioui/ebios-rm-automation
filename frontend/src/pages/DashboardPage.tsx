import React, { useEffect, useState } from 'react';
import { useAuth } from '../store/authContext';
import { useNavigate } from 'react-router-dom';
import { projectsApi, Project } from '../api/projects';
import { useNotifications } from '../hooks/useNotifications';
import { useMyTasks } from '../hooks/useMyTasks';
import { FolderKanban, ClipboardList, Bell, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

const statusClass = (status?: string) =>
  status === 'ACTIVE'
    ? 'bg-green-100 text-green-800'
    : status === 'DISABLED'
      ? 'bg-red-100 text-red-800'
      : 'bg-gray-100 text-gray-700';

const getProjectStatutColor = (statut: string) => {
  switch (statut) {
    case 'BROUILLON': return 'bg-gray-100 text-gray-700';
    case 'EN_COURS': return 'bg-blue-100 text-blue-700';
    case 'EN_PAUSE': return 'bg-yellow-100 text-yellow-700';
    case 'TERMINE': return 'bg-green-100 text-green-700';
    case 'ARCHIVE': return 'bg-gray-200 text-gray-600';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  // const { data: tasks } = useMyTasks(); // Temporarily disabled
  
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const projectsData = await projectsApi.list({ page: 1, page_size: 10, search: undefined, statut: undefined });
      setProjects(projectsData.projects || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const activeProjects = projects.filter(p => p.statut === 'EN_COURS').length;
  const completedProjects = projects.filter(p => p.statut === 'TERMINE').length;

  const recentProjects = projects.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#2f54eb]">Tableau de bord</h1>
        <p className="text-muted-foreground">Bienvenue sur EBIOS RM</p>
      </div>

      {/* Zone fond colorée (sans toucher aux cartes) */}
      <div className="-mx-6 px-6 py-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card rounded-lg border border-border p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/projects')}>
            <div className="flex items-center justify-between mb-4">
              <FolderKanban className="w-8 h-8 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-3xl font-bold">{projects.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Projets</p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/projects')}>
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <span className="text-sm text-muted-foreground">En cours</span>
            </div>
            <p className="text-3xl font-bold">{activeProjects}</p>
            <p className="text-sm text-muted-foreground mt-1">Projets actifs</p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <ClipboardList className="w-8 h-8 text-orange-500" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-3xl font-bold">{completedProjects}</p>
            <p className="text-sm text-muted-foreground mt-1">Projets terminés</p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <Bell className="w-8 h-8 text-red-500" />
              <span className="text-sm text-muted-foreground">Non lues</span>
            </div>
            <p className="text-3xl font-bold">{unreadCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Notifications</p>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Projets récents</h2>
          <button onClick={() => navigate('/projects')} className="text-sm text-primary hover:underline">
            Voir tout
          </button>
        </div>
        {recentProjects.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucun projet pour le moment</p>
        ) : (
          <div className="space-y-3">
            {recentProjects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate(`/projects/${project.id}/atelier-1`)}>
                <div className="flex-1">
                  <p className="font-medium">{project.nom}</p>
                  <p className="text-sm text-muted-foreground">{project.domaine || 'Domaine non spécifié'}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getProjectStatutColor(project.statut)}`}>
                  {project.statut.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Tasks - Temporarily disabled
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              À faire
            </h2>
            <span className="text-sm text-muted-foreground">{tasks?.a_faire.length || 0}</span>
          </div>
          {tasks?.a_faire.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune tâche à faire</p>
          ) : (
            <div className="space-y-2">
              {tasks?.a_faire.map((task, index) => (
                <div 
                  key={`${task.project_id}-${task.activite}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${task.project_id}/atelier-1`)}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{task.label}</p>
                    <p className="text-xs text-muted-foreground">{task.project_nom}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{task.activite}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              À valider
            </h2>
            <span className="text-sm text-muted-foreground">{tasks?.a_valider.length || 0}</span>
          </div>
          {tasks?.a_valider.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucune validation en attente</p>
          ) : (
            <div className="space-y-2">
              {tasks?.a_valider.map((task, index) => (
                <div 
                  key={`${task.project_id}-${task.activite}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${task.project_id}/atelier-1`)}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{task.label}</p>
                    <p className="text-xs text-muted-foreground">{task.project_nom}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{task.activite}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      */}

      {/* User Info */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Informations utilisateur</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">Nom:</span> {user?.first_name} {user?.last_name}
          </p>
          <p>
            <span className="font-medium">Email:</span> {user?.email}
          </p>
          <p>
            <span className="font-medium">Rôle:</span> {user?.role}
          </p>
          <p>
            <span className="font-medium">Statut:</span>{' '}
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(user?.status)}`}
            >
              {user?.status || '—'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

