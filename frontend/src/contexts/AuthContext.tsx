import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, type UserProfile } from '../api/auth.api';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isModalOpen: boolean;
  modalView: 'login' | 'register' | 'forgot-password';
  openModal: (view?: 'login' | 'register' | 'forgot-password') => void;
  closeModal: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (data: { ho_ten: string; email: string; mat_khau: string; so_dien_thoai?: string }) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string, so_dien_thoai: string, mat_khau_moi: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState<'login' | 'register' | 'forgot-password'>('login');

  // On mount, check if we have a token and fetch profile
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    const res = await authApi.getProfile();
    if (res.success && res.data) {
      setUser(res.data);
      setIsLoading(false);
      return res.data;
    } else {
      authApi.logout();
      setUser(null);
      setIsLoading(false);
      return null;
    }
  };

  const openModal = (view: 'login' | 'register' | 'forgot-password' = 'login') => {
    setModalView(view);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, mat_khau: password });
    if (res.success && res.data) {
      const { apiClient } = await import('../api/client');
      apiClient.setTokens(res.data.access_token, res.data.refresh_token);
      const profile = await fetchProfile();
      setIsModalOpen(false);
      return { success: true, message: 'Đăng nhập thành công', profile };
    }
    return { success: false, message: res.message || 'Đăng nhập thất bại' };
  };

  const register = async (data: { ho_ten: string; email: string; mat_khau: string; so_dien_thoai?: string }) => {
    const res = await authApi.register(data);
    if (res.success) {
      // Auto-login after register
      return await login(data.email, data.mat_khau);
    }
    return { success: false, message: res.message || 'Đăng ký thất bại' };
  };

  const forgotPassword = async (email: string, so_dien_thoai: string, mat_khau_moi: string) => {
    const res = await authApi.forgotPassword({ email, so_dien_thoai, mat_khau_moi });
    if (res.success) {
      return { success: true, message: res.message || 'Cập nhật mật khẩu thành công' };
    }
    return { success: false, message: res.message || 'Cập nhật mật khẩu thất bại' };
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading, isModalOpen, modalView,
      openModal, closeModal, login, register, forgotPassword, logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
