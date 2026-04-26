/**
 * Admin API service — CRUD wrappers for all admin management endpoints.
 */
import { apiClient } from './client';

// ─── Users & Roles ───
export const usersApi = {
  list: (page = 1, pageSize = 10, search?: string) =>
    apiClient.get(`/users?page=${page}&page_size=${pageSize}${search ? `&search=${search}` : ''}`),
  get: (id: number) => apiClient.get(`/users/${id}`),
  create: (data: any) => apiClient.post('/users', data),
  update: (id: number, data: any) => apiClient.put(`/users/${id}`, data),
  delete: (id: number) => apiClient.delete(`/users/${id}`),
  roles: () => apiClient.get('/roles'),
  assignRole: (userId: number, roleId: number) =>
    apiClient.post(`/users/${userId}/roles`, { vai_tro_ids: [roleId] }),
};

// ─── Staff ───
export const staffApi = {
  list: (page = 1, pageSize = 10, search?: string) =>
    apiClient.get(`/staff?page=${page}&page_size=${pageSize}${search ? `&search=${search}` : ''}`),
  get: (id: number) => apiClient.get(`/staff/${id}`),
  create: (data: any) => apiClient.post('/staff', data),
  update: (id: number, data: any) => apiClient.put(`/staff/${id}`, data),
  availableForService: (serviceId?: number, apptDate?: string, startTime?: string) => {
    const params = new URLSearchParams();
    if (serviceId) params.append('service_id', String(serviceId));
    if (apptDate) params.append('appt_date', apptDate);
    if (startTime) params.append('start_time', startTime);
    return apiClient.get(`/staff/available-for-service?${params.toString()}`);
  },
};

// ─── Shifts ───
export const shiftsApi = {
  list: () => apiClient.get('/shifts'),
  create: (data: any) => apiClient.post('/shifts', data),
};

// ─── Schedules ───
export const schedulesApi = {
  list: (staffId?: number, fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams();
    if (staffId) params.append('staff_id', String(staffId));
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    return apiClient.get(`/schedules?${params.toString()}`);
  },
  create: (data: any) => apiClient.post('/schedules', data),
  update: (id: number, data: any) => apiClient.put(`/schedules/${id}`, data),
  delete: (id: number) => apiClient.delete(`/schedules/${id}`),
};

// ─── Leave ───
export const leavesApi = {
  list: (staffId?: number, status?: string) => {
    const params = new URLSearchParams();
    if (staffId) params.append('staff_id', String(staffId));
    if (status) params.append('status', status);
    return apiClient.get(`/leaves?${params.toString()}`);
  },
  create: (data: any) => apiClient.post('/leaves', data),
  approve: (id: number, data: { trang_thai: string; ghi_chu_duyet?: string }) =>
    apiClient.put(`/leaves/${id}/approve`, data),
};

// ─── Categories ───
export const categoriesApi = {
  list: () => apiClient.get('/categories'),
  create: (data: any) => apiClient.post('/categories', data),
  update: (id: number, data: any) => apiClient.put(`/categories/${id}`, data),
  delete: (id: number) => apiClient.delete(`/categories/${id}`),
};

// ─── Products ───
export const productsApi = {
  list: (page = 1, pageSize = 10, search?: string, categoryId?: number, loai?: string) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (search) params.append('search', search);
    if (categoryId) params.append('category_id', String(categoryId));
    if (loai) params.append('loai', loai);
    return apiClient.get(`/products?${params.toString()}`);
  },
  get: (id: number) => apiClient.get(`/products/${id}`),
  create: (data: any) => apiClient.post('/products', data),
  update: (id: number, data: any) => apiClient.put(`/products/${id}`, data),
  delete: (id: number) => apiClient.delete(`/products/${id}`),
  prices: (id: number) => apiClient.get(`/products/${id}/prices`),
  addPrice: (id: number, data: any) => apiClient.post(`/products/${id}/prices`, data),
};

// ─── Combos ───
export const combosApi = {
  details: (comboId: number) => apiClient.get(`/combos/${comboId}/details`),
};

// ─── Appointments ───
export const appointmentsApi = {
  list: (page = 1, pageSize = 10, filters?: { status?: string; customer_id?: number; staff_id?: number; from_date?: string; to_date?: string }) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (filters?.status) params.append('status', filters.status);
    if (filters?.customer_id) params.append('customer_id', String(filters.customer_id));
    if (filters?.staff_id) params.append('staff_id', String(filters.staff_id));
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    return apiClient.get(`/appointments?${params.toString()}`);
  },
  get: (id: number) => apiClient.get(`/appointments/${id}`),
  create: (data: any) => apiClient.post('/appointments', data),
  createPublic: (data: any) => apiClient.post('/appointments/public', data, false),
  update: (id: number, data: any) => apiClient.put(`/appointments/${id}`, data),
  cancel: (id: number) => apiClient.post(`/appointments/${id}/cancel`),
};

// ─── Invoices ───
export const invoicesApi = {
  list: (page = 1, pageSize = 10, status?: string) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (status) params.append('status', status);
    return apiClient.get(`/invoices?${params.toString()}`);
  },
  get: (id: number) => apiClient.get(`/invoices/${id}`),
  create: (data: any) => apiClient.post('/invoices', data),
  updatePending: (id: number, data: any) => apiClient.put(`/invoices/${id}`, data),
  updateStatus: (id: number, data: any) => apiClient.put(`/invoices/${id}/status`, data),
  // Backward-compatible alias
  update: (id: number, data: any) => apiClient.put(`/invoices/${id}/status`, data),
  activePromotions: (orderValue?: number) =>
    apiClient.get(`/invoices/active-promotions${typeof orderValue === 'number' ? `?order_value=${orderValue}` : ''}`),
  pointHistory: (page = 1, pageSize = 20, customerId?: number, invoiceId?: number) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (customerId) params.append('customer_id', String(customerId));
    if (invoiceId) params.append('invoice_id', String(invoiceId));
    return apiClient.get(`/invoices/point-history?${params.toString()}`);
  },
  checkout: (appointmentId: number) => apiClient.post(`/invoices/checkout/${appointmentId}`),
  seedSample: (targetCount = 20, force = false) =>
    apiClient.post(`/invoices/seed-sample?target_count=${targetCount}&force=${force}`),
};

// ─── Payments ───
export const paymentsApi = {
  list: (invoiceId?: number) => {
    if (invoiceId) {
      return apiClient.get(`/payments/invoice/${invoiceId}`);
    }
    return Promise.resolve({ success: true, message: 'Không có mã hóa đơn', data: [] });
  },
  create: (data: any) => apiClient.post('/payments', data),
};

// ─── Promotions ───
export const promotionsApi = {
  list: (page = 1, pageSize = 10) =>
    apiClient.get(`/promotions?page=${page}&page_size=${pageSize}`),
  get: (id: number) => apiClient.get(`/promotions/${id}`),
  create: (data: any) => apiClient.post('/promotions', data),
  update: (id: number, data: any) => apiClient.put(`/promotions/${id}`, data),
  delete: (id: number) => apiClient.delete(`/promotions/${id}`),
};

// ─── Banners ───
export const bannersApi = {
  list: () => apiClient.get('/banners'),
  create: (data: any) => apiClient.post('/banners', data),
  update: (id: number, data: any) => apiClient.put(`/banners/${id}`, data),
  delete: (id: number) => apiClient.delete(`/banners/${id}`),
};

// ─── News ───
export const newsApi = {
  list: (page = 1, pageSize = 10) =>
    apiClient.get(`/news?page=${page}&page_size=${pageSize}`),
  get: (id: number) => apiClient.get(`/news/${id}`),
  create: (data: any) => apiClient.post('/news', data),
  update: (id: number, data: any) => apiClient.put(`/news/${id}`, data),
  delete: (id: number) => apiClient.delete(`/news/${id}`),
};

// ─── Inventory ───
export const inventoryApi = {
  list: (page = 1, pageSize = 10) => apiClient.get(`/inventory?page=${page}&page_size=${pageSize}`),
  update: (id: number, data: any) => apiClient.put(`/inventory/${id}`, data),
};

// ─── Suppliers ───
export const suppliersApi = {
  list: (page = 1, pageSize = 10) => apiClient.get(`/suppliers?page=${page}&page_size=${pageSize}`),
  create: (data: any) => apiClient.post('/suppliers', data),
  update: (id: number, data: any) => apiClient.put(`/suppliers/${id}`, data),
};

// ─── Import Receipts ───
export const importsApi = {
  list: (page = 1, pageSize = 10) => apiClient.get(`/import-receipts?page=${page}&page_size=${pageSize}`),
  create: (data: any) => apiClient.post('/import-receipts', data),
};

// ─── File Uploads ───
export const uploadApi = {
  banner: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('loai', 'banners');
    const res = await apiClient.upload<{ url: string }>('/upload/image', formData);
    if (res.success && res.data?.url) {
      return { ...res, data: { file_path: res.data.url, url: res.data.url } };
    }
    return res as any;
  },
  news: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('loai', 'news');
    const res = await apiClient.upload<{ url: string }>('/upload/image', formData);
    if (res.success && res.data?.url) {
      return { ...res, data: { file_path: res.data.url, url: res.data.url } };
    }
    return res as any;
  },
  product: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('loai', 'products');
    const res = await apiClient.upload<{ url: string }>('/upload/image', formData);
    if (res.success && res.data?.url) {
      return { ...res, data: { file_path: res.data.url, url: res.data.url } };
    }
    return res as any;
  },
  avatar: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.upload<{ anh_dai_dien: string }>('/upload/avatar', formData);
    if (res.success && res.data?.anh_dai_dien) {
      return { ...res, data: { file_path: res.data.anh_dai_dien, url: res.data.anh_dai_dien } };
    }
    return res as any;
  },
};

// ─── BOM ───
export const bomApi = {
  getByService: (serviceId: number) => apiClient.get(`/bom/service/${serviceId}`),
  create: (serviceId: number, data: any) => apiClient.post(`/bom/service/${serviceId}`, data),
  delete: (bomId: number) => apiClient.delete(`/bom/${bomId}`),
};
