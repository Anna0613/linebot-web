/**
 * 統一API客戶端 - 替代原有的api.ts
 * 集成統一認證管理、自動重試、錯誤處理
 */

import { authManager } from './UnifiedAuthManager';
import { secureLog } from '../utils/secureTokenUtils';
import { API_CONFIG, getApiUrl } from '../config/apiConfig';

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
  success?: boolean;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  retries?: number;
  timeout?: number;
  skipAuth?: boolean;
}

export class UnifiedApiClient {
  private static instance: UnifiedApiClient;
  private readonly defaultTimeout = 10000; // 10秒
  private readonly defaultRetries = 1;

  private constructor() {}

  public static getInstance(): UnifiedApiClient {
    if (!UnifiedApiClient.instance) {
      UnifiedApiClient.instance = new UnifiedApiClient();
    }
    return UnifiedApiClient.instance;
  }

  /**
   * 統一的請求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      retries = this.defaultRetries,
      timeout = this.defaultTimeout,
      skipAuth = false,
    } = options;

    let lastError: Error | null = null;

    // 重試邏輯
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const requestHeaders = await this.buildHeaders(headers, skipAuth);
        const requestInit: RequestInit = {
          method,
          headers: requestHeaders,
          credentials: 'include',
          ...(body && { body: JSON.stringify(body) }),
        };

        // 超時控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        requestInit.signal = controller.signal;

        secureLog(`API請求: ${method} ${endpoint}`, {
          attempt: attempt + 1,
          skipAuth,
        });

        const response = await fetch(endpoint, requestInit);
        clearTimeout(timeoutId);

        return await this.handleResponse<T>(response);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('請求失敗');
        
        // 如果是最後一次嘗試或者是認證錯誤，不再重試
        if (
          attempt === retries ||
          error instanceof Error && error.message.includes('401')
        ) {
          break;
        }

        // 漸進式延遲重試
        await this.delay(Math.pow(2, attempt) * 1000);
        secureLog(`重試請求: ${method} ${endpoint}`, { attempt: attempt + 1 });
      }
    }

    return {
      error: lastError?.message || '請求失敗',
      status: 0,
    };
  }

  /**
   * 構建請求headers
   */
  private async buildHeaders(
    customHeaders: Record<string, string>,
    skipAuth: boolean
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders,
    };

    if (!skipAuth) {
      // 檢查認證狀態並自動刷新
      const isAuthenticated = await authManager.isAuthenticated();
      
      if (isAuthenticated) {
        const authHeaders = authManager.getAuthHeaders();
        Object.assign(headers, authHeaders);
      }
    }

    return headers;
  }

  /**
   * 處理響應
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const { status } = response;
    const contentType = response.headers.get('content-type');

    try {
      // 嘗試解析JSON
      let data: any;
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // 處理認證失敗
      if (status === 401) {
        secureLog('認證失敗，清除認證信息');
        authManager.handleAuthError({ status, message: data.error || '認證已過期' });
        return {
          error: data.error || '認證已過期，請重新登入',
          status,
        };
      }

      // 處理其他錯誤狀態
      if (status >= 400) {
        const errorMessage = this.getErrorMessage(status, data);
        return {
          error: errorMessage,
          status,
        };
      }

      // 成功響應
      return {
        data,
        status,
        success: true,
      };
    } catch (error) {
      // JSON解析失敗或其他錯誤
      const errorMessage = this.getErrorMessage(status);
      return {
        error: errorMessage,
        status,
      };
    }
  }

  /**
   * 獲取錯誤信息
   */
  private getErrorMessage(status: number, data?: any): string {
    // 優先使用API返回的錯誤信息
    if (data?.error) return data.error;
    if (data?.detail) return data.detail;
    if (data?.message) return data.message;

    // 默認錯誤信息
    const errorMessages: Record<number, string> = {
      400: '請求參數錯誤',
      401: '認證失敗',
      403: '權限不足',
      404: '資源不存在',
      409: '資源衝突',
      422: '資料驗證失敗',
      429: '請求過於頻繁',
      500: '伺服器內部錯誤',
      502: '網關錯誤',
      503: '服務暫時不可用',
      504: '網關超時',
    };

    return errorMessages[status] || `HTTP ${status} 錯誤`;
  }

  /**
   * 延遲函數
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // HTTP方法包裝器
  public async get<T = unknown>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public async post<T = unknown>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: data });
  }

  public async put<T = unknown>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: data });
  }

  public async delete<T = unknown>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  public async patch<T = unknown>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: data });
  }

  // 認證相關API
  public async login(username: string, password: string): Promise<ApiResponse> {
    return this.post(
      getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.LOGIN),
      { username, password },
      { skipAuth: true }
    );
  }

  public async register(userData: { username: string; email: string; password: string }): Promise<ApiResponse> {
    return this.post(
      getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.REGISTER),
      userData,
      { skipAuth: true }
    );
  }

  public async logout(): Promise<ApiResponse> {
    const result = await this.post(
      getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.LOGOUT)
    );
    
    // 無論後端響應如何，都清除本地認證信息
    authManager.clearAuth();
    
    return result;
  }

  public async checkLoginStatus(): Promise<ApiResponse> {
    return this.get(
      getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.CHECK_LOGIN)
    );
  }

  // 用戶資料相關API
  public async getProfile(): Promise<ApiResponse> {
    return this.get(
      getApiUrl(API_CONFIG.SETTING.BASE_URL, API_CONFIG.SETTING.ENDPOINTS.GET_PROFILE)
    );
  }

  public async updateProfile(profileData: {
    username?: string;
    email?: string;
    display_name?: string;
  }): Promise<ApiResponse> {
    return this.put(
      getApiUrl(API_CONFIG.SETTING.BASE_URL, API_CONFIG.SETTING.ENDPOINTS.UPDATE_PROFILE),
      profileData
    );
  }

  public async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    return this.post(
      getApiUrl(API_CONFIG.SETTING.BASE_URL, API_CONFIG.SETTING.ENDPOINTS.CHANGE_PASSWORD),
      {
        current_password: currentPassword,
        new_password: newPassword,
      }
    );
  }

  // Bot管理相關API
  public async getBots(): Promise<ApiResponse> {
    return this.get(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, API_CONFIG.PUZZLE.ENDPOINTS.GET_BOTS)
    );
  }

  public async createBot(botData: {
    name: string;
    channel_token: string;
    channel_secret: string;
  }): Promise<ApiResponse> {
    return this.post(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, API_CONFIG.PUZZLE.ENDPOINTS.CREATE_BOT),
      botData
    );
  }

  public async updateBot(
    botId: string,
    botData: { name?: string; channel_token?: string; channel_secret?: string }
  ): Promise<ApiResponse> {
    return this.put(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, API_CONFIG.PUZZLE.ENDPOINTS.UPDATE_BOT(botId)),
      botData
    );
  }

  public async deleteBot(botId: string): Promise<ApiResponse> {
    return this.delete(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, API_CONFIG.PUZZLE.ENDPOINTS.DELETE_BOT(botId))
    );
  }

  // LINE登入相關API
  public async getLineLoginUrl(): Promise<ApiResponse> {
    return this.post(
      getApiUrl(API_CONFIG.LINE_LOGIN.BASE_URL, API_CONFIG.LINE_LOGIN.ENDPOINTS.LINE_LOGIN),
      {},
      { skipAuth: true }
    );
  }

  public async verifyLineToken(token: string): Promise<ApiResponse> {
    return this.post(
      getApiUrl(API_CONFIG.LINE_LOGIN.BASE_URL, API_CONFIG.LINE_LOGIN.ENDPOINTS.VERIFY_TOKEN),
      { token },
      { skipAuth: true }
    );
  }
}

// 導出單例實例
export const apiClient = UnifiedApiClient.getInstance();