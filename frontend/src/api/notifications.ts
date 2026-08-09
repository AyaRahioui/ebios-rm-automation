import apiClient from './client';

export type NotificationType = 
  | 'INVITATION'
  | 'MISSION_ASSIGNED'
  | 'DOCUMENT_ADDED'
  | 'MISSION_ACCEPTED'
  | 'MISSION_DECLINED';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  payload?: any;
  related_project_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
  page: number;
  page_size: number;
}

export const notificationsApi = {
  getAll: async () => {
    const response = await apiClient.get<NotificationListResponse>('/notifications');
    return response.data.notifications;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: string) => {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async () => {
    await apiClient.patch('/notifications/read-all');
  },

  deleteNotification: async (id: string) => {
    await apiClient.delete(`/notifications/${id}`);
  },
};
