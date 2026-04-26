/**
 * Appointments API
 */
import { apiClient } from './client';

export interface AppointmentDetail {
  ma_san_pham: number;
  ma_nhan_vien?: number;
  ma_combo_kh?: number;
  gio_bat_dau?: string;
  gio_ket_thuc?: string;
  gia?: number;
  ghi_chu?: string;
}

export interface GuestInfo {
  ho_ten: string;
  so_dien_thoai?: string;
  ghi_chu?: string;
}

export interface CreateAppointmentPayload {
  ngay_hen: string;  // YYYY-MM-DD
  gio_bat_dau: string; // HH:MM
  gio_ket_thuc?: string;
  ghi_chu?: string;
  khach_di_kems?: GuestInfo[];
  chi_tiets: AppointmentDetail[];
}

export const appointmentsApi = {
  create: (payload: CreateAppointmentPayload) =>
    apiClient.post('/appointments', payload),

  getMyAppointments: (page = 1) =>
    apiClient.get(`/appointments?page=${page}`),

  cancel: (id: number) =>
    apiClient.post(`/appointments/${id}/cancel`),
};
