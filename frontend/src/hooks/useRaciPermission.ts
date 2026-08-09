import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

interface RACIPermissionResponse {
  activite_code: string;
  user_role: 'R' | 'A' | 'C' | 'I' | '-';
  can_read: boolean;
  can_write: boolean;
  can_validate: boolean;
}

export const useMyRaciRole = (projectId: string, activiteCode: string) => {
  return useQuery({
    queryKey: ['raci-my-role', projectId, activiteCode],
    queryFn: async (): Promise<RACIPermissionResponse> => {
      // Utiliser apiClient (axios) qui gère automatiquement le token (access_token)
      // et le refresh via l'interceptor — évite les erreurs 401 → "Non assigné".
      try {
        const res = await apiClient.get<RACIPermissionResponse>(
          `/raci/projects/${projectId}/permissions`,
          { params: { activite: activiteCode } }
        );
        return res.data;
      } catch (err) {
        console.error('Erreur récupération permissions RACI:', err);
        return {
          activite_code: activiteCode,
          user_role: '-',
          can_read: false,
          can_write: false,
          can_validate: false,
        };
      }
    },
    enabled: !!projectId && !!activiteCode,
  });
};
