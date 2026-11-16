export interface AdminUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string | null;
  is_staff: boolean;
  is_superuser: boolean;
  is_email_verified?: boolean;
}

export interface AdminAuthState {
  user: AdminUser | null;
  accessToken: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  setAuth: (accessToken: string, user: AdminUser) => void;
  clearAuth: () => Promise<void>;
  refreshAuth: () => Promise<string | null>;
}
