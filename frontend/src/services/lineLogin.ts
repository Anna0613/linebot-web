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
      const response = await this.apiClient.post<LineLoginResponse>(
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

  // 驗證LINE登入token，增加重試機制
  public async verifyToken(token: string, maxRetries = 3): Promise<LineLoginResponse> {
    let retries = 0;
    let lastError: Error | null = null;

    while (retries < maxRetries) {
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
        lastError = error instanceof Error ? error : new Error('Token驗證失敗');
        retries++;
        
        // 如果還有重試次數，等待一段時間後重試
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // 逐次增加等待時間
          console.log(`嘗試重新驗證 LINE token，第 ${retries} 次...`);
        }
      }
    }

    return {
      error: lastError?.message || 'Token驗證失敗，已達最大重試次數'
    };
  }
}
