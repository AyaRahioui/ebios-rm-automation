// User types
export type UserRole = 'ADMIN' | 'CHEF_PROJET' | 'CONSULTANT' | 'CLIENT';
export type UserStatus = 'INVITED' | 'ACTIVE' | 'DISABLED';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  status: UserStatus;
  organization_id?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

// Organization types
export interface Organization {
  id: string;
  nom: string;
  secteur_activite?: string;
  created_at: string;
}

export interface OrganizationDetail extends Organization {
  users: User[];
}

// Project types
export type ProjectStatus = 'BROUILLON' | 'EN_COURS' | 'EN_PAUSE' | 'TERMINE' | 'ARCHIVE';

export interface Project {
  id: string;
  nom: string;
  description?: string;
  domaine?: string;
  statut: ProjectStatus;
  methode_cotation: string;
  organization_id: string;
  chef_de_projet_id: string;
  created_at: string;
  updated_at: string;
}

// Project Member types
export type ProjectMemberStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  status: ProjectMemberStatus;
  invited_at: string;
  responded_at?: string;
  user_email?: string;
  user_first_name?: string;
  user_last_name?: string;
}

// Document types
export interface Document {
  id: string;
  project_id: string;
  uploaded_by_id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
  uploaded_by_email?: string;
  uploaded_by_name?: string;
}

// Notification types
export type NotificationType = 'INVITATION' | 'MISSION_ASSIGNED' | 'DOCUMENT_ADDED' | 'MISSION_ACCEPTED' | 'MISSION_DECLINED';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  payload?: Record<string, unknown>;
  related_project_id?: string;
  is_read: boolean;
  created_at: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
}

export interface InvitationVerifyResponse {
  valid: boolean;
  email?: string;
  role?: string;
  expires_at?: string;
}

// API Response types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
