import apiClient from './client';



export type Project = {

  id: string;

  nom: string;

  description: string | null;

  domaine: string | null;

  statut: string;

  methode_cotation: string;

  chef_de_projet_id: string;

  created_at: string;

  updated_at: string;

};



export type ProjectListResponse = {

  projects: Project[];

  total: number;

  page: number;

  page_size: number;

};



export type ProjectCreate = {

  nom: string;

  description?: string | null;

  domaine?: string | null;

  statut?: string;

  methode_cotation?: string;

  client_id?: string | null;

  consultant_ids?: string[];

};





export type ProjectUpdate = Partial<ProjectCreate>;



export const projectsApi = {

  list: async (params?: {

    page?: number;

    page_size?: number;

    statut?: string;

    search?: string;

  }): Promise<ProjectListResponse> => {

    const response = await apiClient.get<ProjectListResponse>('/projects', { params });

    return response.data;

  },



  create: async (data: ProjectCreate): Promise<Project> => {

    const response = await apiClient.post<Project>('/projects', data);

    return response.data;

  },



  get: async (id: string): Promise<Project> => {

    const response = await apiClient.get<Project>(`/projects/${id}`);

    return response.data;

  },



  update: async (id: string, data: ProjectUpdate): Promise<Project> => {

    const response = await apiClient.patch<Project>(`/projects/${id}`, data);

    return response.data;

  },



  delete: async (id: string): Promise<{ message: string }> => {

    const response = await apiClient.delete<{ message: string }>(`/projects/${id}`);

    return response.data;

  },

};



