import apiClient from './client';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  activation_link?: string | null;

}

export interface UserCreate {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  organization_id?: string;
}

export interface UserUpdate {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  status?: string;
  organization_id?: string;
}


export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  page_size: number;
}

export const usersApi = {
  list: async (params?: { page?: number; page_size?: number; role?: string; status?: string; search?: string }): Promise<UserListResponse> => {
    const response = await apiClient.get<UserListResponse>('/admin/users', { params });
    return response.data;
  },

  create: async (data: UserCreate): Promise<User> => {
    const response = await apiClient.post<User>('/admin/users', data);
    return response.data;
  },
  get: async (id: string): Promise<User> => {
    const response = await apiClient.get<User>(`/admin/users/${id}`);
    return response.data;
  },
  update: async (id: string, data: Partial<UserUpdate>): Promise<User> => {
    const response = await apiClient.patch<User>(`/admin/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${id}`);
  },

  resendInvitation: async (id: string): Promise<{ message: string; activation_link?: string }> => {

    const response = await apiClient.post<{ message: string; activation_link?: string }>(`/admin/users/${id}/resend-invitation`);
    return response.data;
  },
};
