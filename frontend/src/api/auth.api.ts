/**
 * Auth API service — Login, Register, Profile, etc.
 */
import { apiClient } from './client';

export interface LoginPayload {
  email: string;
  mat_khau: string;
}

export interface RegisterPayload {
  ho_ten: string;
  email: string;
  mat_khau: string;
  so_dien_thoai?: string;
}

export interface TokenData {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserProfile {
  ma_nguoi_dung: number;
  ho_ten: string;
  email: string;
  so_dien_thoai?: string;
  gioi_tinh?: string;
  dia_chi?: string;
  anh_dai_dien?: string;
  vai_tros: string[];
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<TokenData>('/auth/login', payload, false),

  register: (payload: RegisterPayload) =>
    apiClient.post('/auth/register', payload, false),

  getProfile: () =>
    apiClient.get<UserProfile>('/auth/profile'),

  getMyAppointments: () =>
    apiClient.get<any>('/appointments/me'),

  changePassword: (mat_khau_cu: string, mat_khau_moi: string) =>
    apiClient.post('/auth/change-password', { mat_khau_cu, mat_khau_moi }),

  forgotPassword: (payload: { email: string; so_dien_thoai: string; mat_khau_moi: string }) =>
    apiClient.post('/auth/forgot-password', payload, false),

  logout: () => {
    apiClient.clearTokens();
  },
};
