/**
 * API Client - Axios-like fetch wrapper with JWT token management.
 * Handles authentication, token refresh, and standardized responses.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').trim();

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  errors?: Record<string, string[]>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async request<T = any>(
    method: string,
    path: string,
    body?: any,
    requireAuth: boolean = true,
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requireAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    try {
      let response = await fetch(`${this.baseUrl}${path}`, config);

      // If 401 and we have refresh token, try refreshing
      if (response.status === 401 && requireAuth) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.getToken()}`;
          config.headers = headers;
          response = await fetch(`${this.baseUrl}${path}`, config);
        }
      }

      const text = await response.text();
      let data: any;
      if (!text) {
        if (!response.ok) {
          throw new Error(`Lỗi HTTP ${response.status} từ ${path} (Không có dữ liệu trả về)`);
        }
        data = { success: true, message: 'Thành công (Empty response)' };
      } else {
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`Lỗi dữ liệu từ ${path}: JSON không hợp lệ`);
        }
      }
      return data as ApiResponse<T>;
    } catch (error: any) {
      const isNetworkError = String(error?.message || '').toLowerCase().includes('failed to fetch');
      return {
        success: false,
        message: isNetworkError
          ? 'Không kết nối được Backend API. Kiểm tra backend đang chạy ở cổng 8000.'
          : (error.message || 'Lỗi kết nối đến server'),
      };
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          this.setTokens(data.data.access_token, data.data.refresh_token);
          return true;
        }
      }
    } catch {
      // Refresh failed
    }

    this.clearTokens();
    return false;
  }

  // HTTP methods
  get<T = any>(path: string, requireAuth = true) {
    return this.request<T>('GET', path, undefined, requireAuth);
  }

  post<T = any>(path: string, body?: any, requireAuth = true) {
    return this.request<T>('POST', path, body, requireAuth);
  }

  put<T = any>(path: string, body?: any, requireAuth = true) {
    return this.request<T>('PUT', path, body, requireAuth);
  }

  delete<T = any>(path: string, requireAuth = true) {
    return this.request<T>('DELETE', path, undefined, requireAuth);
  }

  async upload<T>(path: string, formData: FormData, requireAuth = true): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {};
    if (requireAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const config: RequestInit = {
      method: 'POST',
      headers,
      body: formData,
    };

    try {
      let response = await fetch(`${this.baseUrl}${path}`, config);

      if (response.status === 401 && requireAuth) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.getToken()}`;
          config.headers = headers;
          response = await fetch(`${this.baseUrl}${path}`, config);
        }
      }

      const text = await response.text();
      let data: any;
      if (!text) {
        if (!response.ok) {
          throw new Error(`Lỗi HTTP ${response.status} từ ${path} (Không có dữ liệu trả về)`);
        }
        data = { success: true, message: 'Thành công (Empty response)' };
      } else {
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`Lỗi dữ liệu từ ${path}: JSON không hợp lệ`);
        }
      }
      return data as ApiResponse<T>;
    } catch (error: any) {
      const isNetworkError = String(error?.message || '').toLowerCase().includes('failed to fetch');
      return {
        success: false,
        message: isNetworkError
          ? 'Không kết nối được Backend API. Kiểm tra backend đang chạy ở cổng 8000.'
          : (error.message || 'Lỗi kết nối đến server'),
      };
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export type { ApiResponse };
