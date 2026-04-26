import { apiClient } from '../../../api/client';

export const receptionistApi = {
  // Appointments
  getAppointments: (page = 1, pageSize = 10, status?: string, date?: string) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (status) params.append('status', status);
    if (date) {
      params.append('from_date', date);
      params.append('to_date', date);
    }
    return apiClient.get(`/appointments?${params.toString()}`);
  },
  getAppointment: (id: number) => apiClient.get(`/appointments/${id}`),
  createPublicAppointment: (data: any) => apiClient.post('/appointments/public', data, false),
  updateAppointment: (id: number, data: any) => apiClient.put(`/appointments/${id}`, data),
  cancelAppointment: (id: number, reason: string) => 
    apiClient.post(`/appointments/${id}/cancel`),

  // Staff lookup
  getAvailableStaff: (serviceId?: number) =>
    apiClient.get(`/staff/available-for-service${serviceId ? `?service_id=${serviceId}` : ''}`),

  // Leave Requests
  getLeaves: (page = 1, pageSize = 10) => 
    apiClient.get(`/leaves?page=${page}&page_size=${pageSize}`),
  createLeave: (data: any) => apiClient.post('/leaves', data),

  // Invoices
  getInvoice: (id: number) => apiClient.get(`/invoices/${id}`),
  getInvoices: (page = 1, pageSize = 10) => apiClient.get(`/invoices?page=${page}&page_size=${pageSize}`),
  payInvoiceCash: (invoiceId: number) =>
    apiClient.post(`/payments/pay-invoice/${invoiceId}`, { phuong_thuc: 'CASH' }),
  createVnpayUrl: (invoiceId: number, returnUrl?: string) =>
    apiClient.post('/payments/vnpay/create-url', { ma_hoa_don: invoiceId, return_url: returnUrl }),
  handleVnpayCallback: (params: URLSearchParams | Record<string, string>) => {
    const query = params instanceof URLSearchParams
      ? params.toString()
      : new URLSearchParams(params).toString();
    return apiClient.get(`/payments/vnpay/callback?${query}`, false);
  },

  // Customers & Lookups
  getCustomers: (search = '', page = 1) => 
    apiClient.get(`/users?search=${search}&page=${page}&page_size=50`),
  
  getPointsHistory: (customerId: number) =>
    apiClient.get(`/invoices/point-history?customer_id=${customerId}`),

  getServiceProducts: () => 
    apiClient.get('/products?loai=SERVICE&page_size=100'),
};
