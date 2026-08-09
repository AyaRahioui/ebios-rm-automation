import React, { useEffect, useState } from 'react';
import { Users, FolderKanban, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import apiClient from '../../api/client';

interface DashboardStats {
  totalUsers: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  pendingValidations: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user: string;
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setIsLoading(true);
      // TODO: Appeler l'endpoint /admin/dashboard-stats
      // Pour l'instant, simuler des données
      const mockStats: DashboardStats = {
        totalUsers: 8,
        totalProjects: 4,
        activeProjects: 2,
        completedProjects: 1,
        pendingValidations: 3,
        recentActivity: [
          {
            id: '1',
            type: 'project_created',
            description: 'Nouveau projet créé: Audit Sécurité SI',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            user: 'Marie Dupont',
          },
          {
            id: '2',
            type: 'validation_submitted',
            description: 'Validation soumise pour A1.1',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            user: 'Jean Durand',
          },
          {
            id: '3',
            type: 'user_created',
            description: 'Nouvel utilisateur créé: Sophie Bernard',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            user: 'Admin Système',
          },
        ],
      };
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return "Il y a moins d'une heure";
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return "Hier";
    return `Il y a ${diffDays} jours`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_created': return <FolderKanban className="w-5 h-5 text-blue-500" />;
      case 'validation_submitted': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'user_created': return <Users className="w-5 h-5 text-purple-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
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
        <h1 className="text-3xl font-bold text-[#2f54eb]">Dashboard Admin</h1>
        <p className="text-muted-foreground">Vue d'ensemble de la plateforme</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-blue-500" />
            <span className="text-sm text-muted-foreground">Total</span>
          </div>
          <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Utilisateurs</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <FolderKanban className="w-8 h-8 text-green-500" />
            <span className="text-sm text-muted-foreground">Total</span>
          </div>
          <p className="text-3xl font-bold">{stats?.totalProjects || 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Projets</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-orange-500" />
            <span className="text-sm text-muted-foreground">En cours</span>
          </div>
          <p className="text-3xl font-bold">{stats?.activeProjects || 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Projets actifs</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <span className="text-sm text-muted-foreground">En attente</span>
          </div>
          <p className="text-3xl font-bold">{stats?.pendingValidations || 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Validations</p>
        </div>
      </div>

      {/* Project Status */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="font-semibold text-lg mb-4">Statut des projets</h3>
        <div className="space-y-4">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm">Terminés</span>
            </div>
            <span className="font-semibold">{stats?.completedProjects || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm">En cours</span>
            </div>
            <span className="font-semibold">{stats?.activeProjects || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span className="text-sm">Brouillon</span>
            </div>
            <span className="font-semibold">{(stats?.totalProjects || 0) - (stats?.activeProjects || 0) - (stats?.completedProjects || 0)}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="font-semibold text-lg mb-4">Activité récente</h3>
        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
          <div className="space-y-4">
            {stats.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Par {activity.user} • {getTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">Aucune activité récente</p>
        )}
      </div>
    </div>
  );
}
