/**
 * Services/Products API — Categories, Products, Pricing
 */
import { apiClient, type ApiResponse } from './client';

export interface Category {
  ma_danh_muc: number;
  ten_danh_muc: string;
  slug: string;
  mo_ta?: string;
  icon?: string;
  thu_tu: number;
  trang_thai: boolean;
}

export interface Pricing {
  ma_bang_gia: number;
  ma_san_pham: number;
  gia: number;
  gia_goc?: number;
  thoi_luong?: string;
}

export interface Product {
  ma_san_pham: number;
  ma_danh_muc: number;
  ten_san_pham: string;
  slug: string;
  mo_ta?: string;
  mo_ta_ngan?: string;
  hinh_anh?: string;
  loai: string;
  thoi_luong?: number;
  ten_danh_muc?: string;
  bang_gias: Pricing[];
  trang_thai: boolean;
}

export const servicesApi = {
  getCategories: () =>
    apiClient.get<Category[]>('/categories', false),

  getProducts: (params?: { page?: number; page_size?: number; category_id?: number; loai?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.page_size) searchParams.set('page_size', String(params.page_size));
    if (params?.category_id) searchParams.set('category_id', String(params.category_id));
    if (params?.loai) searchParams.set('loai', params.loai);
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return apiClient.get<Product[]>(`/products${qs ? '?' + qs : ''}`, false);
  },

  getProduct: (id: number) =>
    apiClient.get<Product>(`/products/${id}`, false),

  getNews: (params?: { page?: number; category?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.category) searchParams.set('category', params.category);
    return apiClient.get(`/news${searchParams.toString() ? '?' + searchParams.toString() : ''}`, false);
  },

  getNewsBySlug: (slug: string) =>
    apiClient.get(`/news/slug/${slug}`, false),

  getBanners: () =>
    apiClient.get('/banners?active_only=true', false),

  getPromotions: () =>
    apiClient.get('/promotions?status=ACTIVE', false),
};
