import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Check, X, Eye, Clock, AlertCircle } from 'lucide-react';

interface ValidationItem {
  id: string;
  projectId: string;
  projectName: string;
  activity: string;
  activityId: string;
  description: string;
  submittedAt: string;
  submittedBy: string;
  priority: 'low' | 'medium' | 'high';
}

export default function ClientValidationsPage() {
  const navigate = useNavigate();
  const [validations, setValidations] = useState<ValidationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadValidations();
  }, []);

  const loadValidations = async () => {
    try {
      setIsLoading(true);
      // TODO: Appeler l'API pour récupérer les validations en attente
      // Pour l'instant, simuler des données
      const mockValidations: ValidationItem[] = [
        {
          id: '1',
          projectId: 'proj-1',
          projectName: 'Audit Sécurité SI - Banque XYZ',
          activity: 'A1.1 - Cadrage',
          activityId: 'a1-1',
          description: 'Validation du cadrage du projet',
          submittedAt: new Date(Date.now() - 86400000).toISOString(),
          submittedBy: 'Marie Dupont',
          priority: 'high',
        },
        {
          id: '2',
          projectId: 'proj-2',
          projectName: 'Évaluation Risques Cloud - TechCorp',
          activity: 'A1.2 - Actifs',
          activityId: 'a1-2',
          description: 'Validation des valeurs métier et biens supports',
          submittedAt: new Date(Date.now() - 172800000).toISOString(),
          submittedBy: 'Pierre Martin',
          priority: 'medium',
        },
      ];
      setValidations(mockValidations);
    } catch (error) {
      console.error('Error loading validations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (validationId: string) => {
    try {
      // TODO: Appeler l'API pour approuver
      setValidations(prev => prev.filter(v => v.id !== validationId));
    } catch (error) {
      console.error('Error approving validation:', error);
    }
  };

  const handleReject = async (validationId: string) => {
    const reason = prompt('Motif du rejet (optionnel):');
    if (reason !== null) {
      try {
        // TODO: Appeler l'API pour rejeter avec le motif
        setValidations(prev => prev.filter(v => v.id !== validationId));
      } catch (error) {
        console.error('Error rejecting validation:', error);
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Haute';
      case 'medium': return 'Moyenne';
      case 'low': return 'Basse';
      default: return priority;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR');
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
        <h1 className="text-3xl font-bold text-[#2f54eb]">Validations en attente</h1>
        <p className="text-muted-foreground">Validez les livrables soumis par les consultants</p>
      </div>

      {validations.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <p className="text-muted-foreground text-lg">Aucune validation en attente</p>
          <p className="text-muted-foreground text-sm mt-2">Tous les livrables ont été validés</p>
        </div>
      ) : (
        <div className="space-y-4">
          {validations.map((validation) => (
            <div key={validation.id} className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{validation.projectName}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(validation.priority)}`}>
                      {getPriorityLabel(validation.priority)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{validation.activity}</span>
                    <span>•</span>
                    <span>Soumis par {validation.submittedBy}</span>
                    <span>•</span>
                    <span>{getTimeAgo(validation.submittedAt)}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {validation.description}
              </p>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => handleApprove(validation.id)}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Approuver
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReject(validation.id)}
                  className="flex items-center gap-2 text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                  Rejeter
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/projects/${validation.projectId}/atelier-1`)}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Voir le détail
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
