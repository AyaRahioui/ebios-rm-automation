import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi, Project } from '../../api/projects';
import { Button } from '../../components/ui/button';
import { Eye, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function ClientProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await projectsApi.list({ page: 1, page_size: 100, search: undefined, statut: undefined });
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'BROUILLON': return 'bg-gray-100 text-gray-700';
      case 'EN_COURS': return 'bg-blue-100 text-blue-700';
      case 'EN_PAUSE': return 'bg-yellow-100 text-yellow-700';
      case 'TERMINE': return 'bg-green-100 text-green-700';
      case 'ARCHIVE': return 'bg-gray-200 text-gray-600';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'BROUILLON': return <FileText className="w-4 h-4" />;
      case 'EN_COURS': return <Clock className="w-4 h-4" />;
      case 'EN_PAUSE': return <AlertCircle className="w-4 h-4" />;
      case 'TERMINE': return <CheckCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#2f54eb]">Mes Projets</h1>
        <p className="text-muted-foreground">Consultez vos projets EBIOS RM en lecture seule</p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground text-lg">Aucun projet associé à votre compte</p>
          <p className="text-muted-foreground text-sm mt-2">Contactez votre chef de projet pour être assigné à un projet</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{project.nom}</h3>
                  <p className="text-sm text-muted-foreground">{project.domaine || 'Domaine non spécifié'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatutColor(project.statut)}`}>
                  {getStatutIcon(project.statut)}
                  {project.statut.replace('_', ' ')}
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {project.description || 'Aucune description'}
              </p>

              <div className="text-xs text-muted-foreground mb-4">
                <p>Méthode de cotation: {project.methode_cotation || 'Non définie'}</p>
                <p>Créé le: {new Date(project.created_at).toLocaleDateString('fr-FR')}</p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/projects/${project.id}/atelier-1`)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Voir le projet
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
