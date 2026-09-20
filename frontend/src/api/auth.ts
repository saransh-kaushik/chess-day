import { apiClient } from './client';

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface GuestRequest {
  name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    username: string;
    email: string | null;
    is_guest: boolean;
    created_at: string;
  };
}

export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const res = await apiClient.post<AuthResponse>('/auth/register', data);
  return res.data;
};

export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const formData = new URLSearchParams();
  formData.append('username', data.username);
  formData.append('password', data.password);
  const res = await apiClient.post<AuthResponse>('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
};

export const createGuestSession = async (data: GuestRequest): Promise<AuthResponse> => {
  const res = await apiClient.post<AuthResponse>('/auth/guest', data);
  return res.data;
};

export const getMe = async () => {
  const res = await apiClient.get('/auth/me');
  return res.data;
};
