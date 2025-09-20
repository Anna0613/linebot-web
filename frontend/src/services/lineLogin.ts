import { API_CONFIG } from "../config/apiConfig";

export interface LineLoginResponse {
  login_url?: string;
  display_name?: string;
  email?: string;
  error?: string;
}

export class LineLoginService {
  private static instance: LineLoginService;

  private constructor() {
    // 使用統一的 apiClient
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
      const url = `${API_CONFIG.LINE_LOGIN.BASE_URL}${API_CONFIG.LINE_LOGIN.ENDPOINTS.LINE_LOGIN}`;
      console.log('正在請求 LINE 登入 URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      console.log('回應狀態:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('回應錯誤:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('回應資料:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error("Error occurred:", error);
      return {
        error: error instanceof Error ? error.message : "獲取登入連結失敗",
      };
    }
  }

  // 舊的 LINE token 驗證流程已移除。改由後端回調直接設置 Cookie。
}
