import apiClient from './client';

export interface Organization {
  id: string;
  nom: string;
  secteur_activite: string | null;
  created_at: string;
}

export interface OrganizationCreate {
  nom: string;
  secteur_activite?: string;
}

export const organizationsApi = {
  list: async (): Promise<Organization[]> => {
    const response = await apiClient.get<Organization[]>('/admin/organizations');
    return response.data;
  },
  create: async (data: OrganizationCreate): Promise<Organization> => {
    const response = await apiClient.post<Organization>('/admin/organizations', data);
    return response.data;
  },
};