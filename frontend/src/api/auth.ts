import apiClient from './client';
import { LoginRequest, TokenResponse, ForgotPasswordRequest, ResetPasswordRequest, AcceptInvitationRequest, InvitationVerifyResponse } from '../types';

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  me: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<void> => {
    await apiClient.post('/auth/forgot-password', data);
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<void> => {
    await apiClient.post('/auth/reset-password', data);
  },

  verifyInvitation: async (token: string): Promise<InvitationVerifyResponse> => {
    const response = await apiClient.get<InvitationVerifyResponse>(`/auth/invitations/${token}`);
    return response.data;
  },

  acceptInvitation: async (data: AcceptInvitationRequest): Promise<void> => {
    await apiClient.post(`/auth/accept-invitation/${data.token}`, { password: data.password });
  },
};
