import { apiClient } from './client';

type ProductQueryParams = {
  page?: number;
  page_size?: number;
  search?: string;
  category_id?: number | string;
  loai?: string;
};

export const publicApi = {
  // --- Categories ---
  getCategories: () => {
    return apiClient.request<any[]>('GET', '/categories', undefined, false);
  },

  // --- Products / Services ---
  getProducts: (params?: ProductQueryParams) => {
    let queryParams = new URLSearchParams();
    if (params) {
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.page_size) queryParams.append('page_size', params.page_size.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.category_id) queryParams.append('category_id', params.category_id.toString());
      if (params.loai) queryParams.append('loai', params.loai);
    }
    if (!params?.page_size) queryParams.append('page_size', '200');
    const queryStr = queryParams.toString();
    return apiClient.request<any[]>('GET', `/products${queryStr ? '?' + queryStr : ''}`, undefined, false);
  },

  // Fetch all products across pagination for screens that need full dataset.
  getAllProducts: async (params?: Omit<ProductQueryParams, 'page'>) => {
    const pageSize = params?.page_size || 200;
    let page = 1;
    let totalPages = 1;
    const allProducts: any[] = [];
    let message = 'Thành công';

    do {
      const res = await publicApi.getProducts({ ...params, page, page_size: pageSize });
      if (!res.success) return res;

      message = res.message;
      if (Array.isArray(res.data)) {
        allProducts.push(...res.data);
      }

      totalPages = res.meta?.total_pages || 1;
      page += 1;
    } while (page <= totalPages);

    return {
      success: true,
      message,
      data: allProducts,
      meta: {
        page: 1,
        page_size: allProducts.length,
        total: allProducts.length,
        total_pages: 1,
      },
    };
  },

  getProductById: (id: string | number) => {
    return apiClient.request<any>('GET', `/products/${id}`, undefined, false);
  },

  getProductPrices: (id: string | number) => {
    return apiClient.request<any[]>('GET', `/products/${id}/prices`, undefined, false);
  },

  // --- Marketing (Banners & Promotions) ---
  getBanners: (activeOnly: boolean = true) => {
    return apiClient.request<any[]>('GET', `/banners?active_only=${activeOnly}`, undefined, false);
  },

  getPromotions: (params?: { page?: number; page_size?: number; status?: string }) => {
    let queryParams = new URLSearchParams();
    if (params) {
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.page_size) queryParams.append('page_size', params.page_size.toString());
      if (params.status) queryParams.append('status', params.status);
    }
    const queryStr = queryParams.toString();
    return apiClient.request<any[]>('GET', `/promotions${queryStr ? '?' + queryStr : ''}`, undefined, false);
  },

  // --- News ---
  getNews: (params?: { page?: number; page_size?: number; category?: string; status?: string }) => {
    let queryParams = new URLSearchParams();
    if (params) {
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.page_size) queryParams.append('page_size', params.page_size.toString());
      if (params.category) queryParams.append('category', params.category);
      if (params.status) queryParams.append('status', params.status);
    }
    const queryStr = queryParams.toString();
    return apiClient.request<any[]>('GET', `/news${queryStr ? '?' + queryStr : ''}`, undefined, false);
  },

  getNewsBySlug: (slug: string) => {
    return apiClient.request<any>('GET', `/news/slug/${slug}`, undefined, false);
  },

  // --- Appointments ---
  getAvailableStaffPublic: (params: { service_id: number; date: string; time: string }) => {
    let queryParams = new URLSearchParams();
    queryParams.append('service_id', params.service_id.toString());
    queryParams.append('appt_date', params.date);
    queryParams.append('start_time', params.time);
    return apiClient.request<any[]>('GET', `/staff/available-public?${queryParams.toString()}`, undefined, false);
  },

  createAppointment: (data: {
    ho_ten: string;
    so_dien_thoai: string;
    ngay_hen: string;
    gio_bat_dau: string;
    ghi_chu?: string;
    khach_di_kems?: { ho_ten: string; so_dien_thoai?: string }[];
    chi_tiets?: {
      ma_san_pham: number;
      ma_nhan_vien?: number | null;
      chi_so_khach_di_kem?: number | null;
    }[];
  }) => {
    return apiClient.request<any>('POST', '/appointments/public', data, true);
  }
};
