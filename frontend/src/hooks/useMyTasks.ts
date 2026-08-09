import { useQuery } from '@tanstack/react-query';

interface Task {
  project_id: string;
  project_nom: string;
  activite: string;
  label: string;
}

interface MyTasksResponse {
  a_faire: Task[];
  a_valider: Task[];
}

export const useMyTasks = () => {
  return useQuery({
    queryKey: ['my-tasks'],
    queryFn: async (): Promise<MyTasksResponse> => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/me/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return { a_faire: [], a_valider: [] };
      }
      return res.json();
    },
  });
};
