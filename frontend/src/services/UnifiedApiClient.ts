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
      } catch (_error) {
        lastError = _error instanceof Error ? _error : new Error('請求失敗');
        
        // 如果是 token 刷新成功，立即重試一次（不計入重試次數）
        if (_error instanceof Error && _error.message === 'TOKEN_REFRESHED') {
          secureLog('Token 已刷新，立即重試請求');
          continue;
        }
        
        // 如果是最後一次嘗試或者是認證錯誤，不再重試
        if (
          attempt === retries ||
          _error instanceof Error && _error.message.includes('401')
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
      let data: unknown;
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // 處理認證失敗
      if (status === 401) {
        secureLog('收到 401 錯誤，嘗試刷新 token');
        
        // 嘗試刷新 token（只對記住我的用戶）
        if (authManager.isRememberMeActive()) {
          try {
            const refreshed = await authManager.refreshToken();
            if (refreshed) {
              secureLog('Token 刷新成功，重新嘗試原始請求');
              // 這裡不返回錯誤，讓外層重試邏輯來處理
              throw new Error('TOKEN_REFRESHED');
            }
          } catch (refreshError) {
            if (refreshError.message === 'TOKEN_REFRESHED') {
              throw refreshError; // 重新拋出以觸發重試
            }
            secureLog('Token 刷新失敗:', refreshError);
          }
        }
        
        // 如果不是記住我模式或刷新失敗，清除認證信息
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
    } catch (_error) {
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
  private getErrorMessage(status: number, data?: unknown): string {
    // 優先使用API返回的錯誤信息
    if (data && typeof data === 'object' && data !== null) {
      const errorObj = data as Record<string, unknown>;
      if (typeof errorObj.error === 'string') return errorObj.error;
      if (typeof errorObj.detail === 'string') return errorObj.detail;
      if (typeof errorObj.message === 'string') return errorObj.message;
    }

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

  public async getBot(botId: string): Promise<ApiResponse> {
    return this.get(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, API_CONFIG.PUZZLE.ENDPOINTS.GET_BOT(botId))
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

  // 用戶頭像相關API
  public async getAvatar(): Promise<ApiResponse> {
    return this.get(
      getApiUrl(API_CONFIG.SETTING.BASE_URL, API_CONFIG.SETTING.ENDPOINTS.GET_AVATAR)
    );
  }

  public async getUserAvatar(): Promise<ApiResponse> {
    return this.getAvatar();
  }

  public async updateAvatar(avatar: string): Promise<ApiResponse> {
    return this.put(
      getApiUrl(API_CONFIG.SETTING.BASE_URL, API_CONFIG.SETTING.ENDPOINTS.UPDATE_AVATAR),
      { avatar_base64: avatar }
    );
  }

  public async uploadAvatar(formData: FormData): Promise<ApiResponse> {
    try {
      // 從 FormData 中獲取文件並轉換為 base64
      const file = formData.get('avatar') as File;
      if (!file) {
        return {
          error: "未找到頭像文件",
          status: 400,
        };
      }

      // 將文件轉換為 base64
      const base64 = await this.fileToBase64(file);
      
      return this.updateAvatar(base64);
    } catch (_error) {
      return {
        error: "頭像處理失敗",
        status: 0,
      };
    }
  }

  public async deleteAvatar(): Promise<ApiResponse> {
    return this.delete(
      getApiUrl(API_CONFIG.SETTING.BASE_URL, API_CONFIG.SETTING.ENDPOINTS.DELETE_AVATAR)
    );
  }

  // 文件轉 base64 的輔助方法
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 刪除帳號
  public async deleteAccount(): Promise<ApiResponse> {
    return this.delete(
      getApiUrl(API_CONFIG.SETTING.BASE_URL, API_CONFIG.SETTING.ENDPOINTS.DELETE_ACCOUNT)
    );
  }

  // 重新發送電子郵件驗證
  public async resendEmailVerification(): Promise<ApiResponse> {
    return this.post(
      getApiUrl(API_CONFIG.SETTING.BASE_URL, API_CONFIG.SETTING.ENDPOINTS.RESEND_EMAIL_VERIFICATION)
    );
  }

  // 檢查電子郵件驗證狀態
  public async checkEmailVerification(): Promise<ApiResponse> {
    return this.get(
      getApiUrl(API_CONFIG.SETTING.BASE_URL, API_CONFIG.SETTING.ENDPOINTS.CHECK_EMAIL_VERIFICATION)
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

  // 邏輯模板相關API
  public async getBotLogicTemplates(botId: string): Promise<ApiResponse> {
    return this.get(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, `/${botId}/logic-templates`)
    );
  }

  public async activateLogicTemplate(templateId: string): Promise<ApiResponse> {
    return this.post(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, `/logic-templates/${templateId}/activate`)
    );
  }

  public async deactivateLogicTemplate(templateId: string): Promise<ApiResponse> {
    // 暫時使用 POST 方法，實際可能需要根據後端 API 設計調整
    return this.post(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, `/logic-templates/${templateId}/deactivate`)
    );
  }

  public async updateLogicTemplate(templateId: string, data: any): Promise<ApiResponse> {
    return this.put(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, `/logic-templates/${templateId}`),
      data
    );
  }

  // LINE Bot 分析 API
  public async getBotAnalytics(botId: string, period: string = "week"): Promise<ApiResponse> {
    return this.get(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, `/${botId}/analytics?period=${period}`)
    );
  }

  public async getBotMessageStats(botId: string, days: number = 7): Promise<ApiResponse> {
    return this.get(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, `/${botId}/messages/stats?days=${days}`)
    );
  }

  public async getBotUserActivity(botId: string): Promise<ApiResponse> {
    return this.get(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, `/${botId}/users/activity`)
    );
  }

  public async getBotUsageStats(botId: string): Promise<ApiResponse> {
    return this.get(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, `/${botId}/usage/stats`)
    );
  }

  public async sendTestMessage(botId: string, messageData: { user_id: string; message: string }): Promise<ApiResponse> {
    return this.post(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, `/${botId}/send-message`),
      messageData
    );
  }

  public async getBotProfile(botId: string): Promise<ApiResponse> {
    return this.get(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, `/${botId}/profile`)
    );
  }

  public async checkBotHealth(botId: string): Promise<ApiResponse> {
    return this.get(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, `/${botId}/health`)
    );
  }

  public async getBotUsers(botId: string, limit: number = 50, offset: number = 0): Promise<ApiResponse> {
    return this.get(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, `/${botId}/users?limit=${limit}&offset=${offset}`)
    );
  }

  public async getUserInteractions(botId: string, lineUserId: string, limit: number = 20): Promise<ApiResponse> {
    return this.get(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, `/${botId}/users/${lineUserId}/interactions?limit=${limit}`)
    );
  }

  public async broadcastMessage(botId: string, messageData: { message: string; user_ids?: string[] }): Promise<ApiResponse> {
    return this.post(
      getApiUrl(API_CONFIG.PUZZLE.BASE_URL, `/${botId}/broadcast`),
      messageData
    );
  }
}

// 導出單例實例
export const apiClient = UnifiedApiClient.getInstance();