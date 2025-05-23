import { AuthService } from './auth';
import { API_CONFIG } from '../config/apiConfig';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export class ApiClient {
  private static instance: ApiClient;
  
  private constructor() {}

  static getInstance(): ApiClient {
    if (!this.instance) {
      this.instance = new ApiClient();
    }
    return this.instance;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const { status } = response;
    
    try {
      const data = await response.json();
      
      if (status === 401) {
        // Token過期或無效，清除認證信息但不立即重定向
        // 讓調用方決定如何處理認證失敗
        console.warn('認證失敗:', data.error || '認證已過期，請重新登入');
        AuthService.clearAuth();
        return { error: data.error || '認證已過期，請重新登入', status };
      }
      
      return status >= 200 && status < 300
        ? { data, status }
        : { error: data.error || '請求失敗', status };
    } catch (e) {
      return { error: '無法解析響應數據', status };
    }
  }

  private getHeaders(): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    const token = AuthService.getToken();
    if (token) {
      headers.append('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        error: '網絡請求失敗',
        status: 0,
      };
    }
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include',
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        error: '網絡請求失敗',
        status: 0,
      };
    }
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include',
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        error: '網絡請求失敗',
        status: 0,
      };
    }
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include',
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        error: '網絡請求失敗',
        status: 0,
      };
    }
  }

  // 登入方法
  async login(username: string, password: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_CONFIG.AUTH.BASE_URL}${API_CONFIG.AUTH.ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: data.error || '登入失敗',
          status: response.status,
        };
      }

      // 確保直接從回應中提取 token
      if (data && data.token) {
        // 直接設置 token 到 localStorage
        AuthService.setToken(data.token);
        
        // 如果有用戶信息，也保存它
        if (data.username) {
          AuthService.setUser({
            username: data.username,
            email: data.email || '',
          });
        }
      } else {
        console.warn('回應中沒有找到 token');
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      console.error('登入請求發生錯誤:', error);
      return {
        error: '網絡請求失敗',
        status: 0,
      };
    }
  }

  // 登出方法
  async logout(): Promise<void> {
    await this.post(
      `${API_CONFIG.AUTH.BASE_URL}${API_CONFIG.AUTH.ENDPOINTS.LOGOUT}`,
    );
    AuthService.clearAuth();
  }

  // 檢查登入狀態
  async checkLoginStatus(): Promise<boolean> {
    if (!AuthService.isAuthenticated()) {
      return false;
    }

    try {
      const response = await this.get(
        `${API_CONFIG.AUTH.BASE_URL}${API_CONFIG.AUTH.ENDPOINTS.CHECK_LOGIN}`,
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
