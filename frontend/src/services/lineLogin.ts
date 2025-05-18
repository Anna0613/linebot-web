import { ApiClient } from './api';
import { API_CONFIG } from '../config/apiConfig';

export interface LineLoginResponse {
  login_url?: string;
  display_name?: string;
  email?: string;
  error?: string;
}

export class LineLoginService {
  private static instance: LineLoginService;
  private apiClient: ApiClient;

  private constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  public static getInstance(): LineLoginService {
    if (!this.instance) {
      this.instance = new LineLoginService();
    }
    return this.instance;
  }

  // 獲取LINE登入URL
  public async getLoginUrl(): Promise<LineLoginResponse> {
    try {
      const response = await this.apiClient.get<LineLoginResponse>(
        `${API_CONFIG.LINE_LOGIN.BASE_URL}${API_CONFIG.LINE_LOGIN.ENDPOINTS.LINE_LOGIN}`
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : '獲取登入連結失敗'
      };
    }
  }

  // 驗證LINE登入token
  public async verifyToken(token: string): Promise<LineLoginResponse> {
    try {
      const response = await this.apiClient.post<LineLoginResponse>(
        `${API_CONFIG.LINE_LOGIN.BASE_URL}${API_CONFIG.LINE_LOGIN.ENDPOINTS.VERIFY_TOKEN}`,
        { token }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data || {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Token驗證失敗'
      };
    }
  }
}
