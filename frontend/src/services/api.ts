import { AuthService } from "./auth";
import { API_CONFIG } from "../config/apiConfig";

interface ApiResponse<T = unknown> {
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
        console.warn("認證失敗:", data.error || "認證已過期，請重新登入");
        AuthService.clearAuth();
        return { error: data.error || "認證已過期，請重新登入", status };
      }

      return status >= 200 && status < 300
        ? { data, status }
        : { error: data.detail || data.error || "請求失敗", status };
    } catch (e) {
      // 如果無法解析 JSON，返回 HTTP 狀態碼對應的錯誤信息
      const errorMessages: { [key: number]: string } = {
        400: "請求參數錯誤",
        401: "認證失敗",
        403: "權限不足",
        404: "資源不存在",
        409: "資源衝突",
        422: "資料驗證失敗",
        500: "伺服器內部錯誤",
      };

      return {
        error: errorMessages[status] || `HTTP ${status} 錯誤`,
        status,
      };
    }
  }

  private getHeaders(): Headers {
    const headers = new Headers({
      "Content-Type": "application/json",
    });

    const token = AuthService.getToken();
    if (token) {
      headers.append("Authorization", `Bearer ${token}`);
    }
    return headers;
  }

  async get<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: this.getHeaders(),
        credentials: "include",
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        error: "網絡請求失敗",
        status: 0,
      };
    }
  }

  async post<T = unknown>(
    endpoint: string,
    data?: unknown
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        error: "網絡請求失敗",
        status: 0,
      };
    }
  }

  async put<T = unknown>(
    endpoint: string,
    data?: unknown
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        error: "網絡請求失敗",
        status: 0,
      };
    }
  }

  async delete<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: this.getHeaders(),
        credentials: "include",
      });
      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        error: "網絡請求失敗",
        status: 0,
      };
    }
  }

  // 登入方法
  async login(username: string, password: string): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${API_CONFIG.AUTH.BASE_URL}${API_CONFIG.AUTH.ENDPOINTS.LOGIN}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || data.detail || "登入失敗",
          status: response.status,
        };
      }

      // 從後端 Token schema 提取 access_token
      if (data && data.access_token) {
        // 設置 token 到 localStorage
        AuthService.setToken(data.access_token);

        // 如果有用戶信息，也保存它
        if (data.user) {
          AuthService.setUser({
            username: data.user.username,
            email: data.user.email || "",
          });
        }

        console.log("登入成功，token 已保存:", data.access_token);
      } else {
        console.warn("回應中沒有找到 access_token:", data);
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      console.error("登入請求發生錯誤:", error);
      return {
        error: "網絡請求失敗",
        status: 0,
      };
    }
  }

  // 登出方法
  async logout(): Promise<void> {
    await this.post(
      `${API_CONFIG.AUTH.BASE_URL}${API_CONFIG.AUTH.ENDPOINTS.LOGOUT}`
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
        `${API_CONFIG.AUTH.BASE_URL}${API_CONFIG.AUTH.ENDPOINTS.CHECK_LOGIN}`
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // 獲取用戶資料
  async getProfile(): Promise<ApiResponse> {
    return this.get(
      `${API_CONFIG.SETTING.BASE_URL}${API_CONFIG.SETTING.ENDPOINTS.GET_PROFILE}`
    );
  }

  // 別名方法 - 為了與 hooks 兼容
  async getUserProfile(): Promise<ApiResponse> {
    return this.getProfile();
  }

  // 更新用戶資料
  async updateProfile(profileData: {
    username?: string;
    email?: string;
  }): Promise<ApiResponse> {
    return this.put(
      `${API_CONFIG.SETTING.BASE_URL}${API_CONFIG.SETTING.ENDPOINTS.UPDATE_PROFILE}`,
      profileData
    );
  }

  // 更新用戶資料（支持顯示名稱）
  async updateUserProfile(profileData: {
    display_name?: string;
    username?: string;
    email?: string;
  }): Promise<ApiResponse> {
    return this.put(
      `${API_CONFIG.SETTING.BASE_URL}${API_CONFIG.SETTING.ENDPOINTS.UPDATE_PROFILE}`,
      profileData
    );
  }

  // 獲取用戶頭像
  async getAvatar(): Promise<ApiResponse> {
    return this.get(
      `${API_CONFIG.SETTING.BASE_URL}${API_CONFIG.SETTING.ENDPOINTS.GET_AVATAR}`
    );
  }

  // 別名方法 - 為了與 hooks 兼容
  async getUserAvatar(): Promise<ApiResponse> {
    return this.getAvatar();
  }

  // 更新用戶頭像
  async updateAvatar(avatar: string): Promise<ApiResponse> {
    return this.put(
      `${API_CONFIG.SETTING.BASE_URL}${API_CONFIG.SETTING.ENDPOINTS.UPDATE_AVATAR}`,
      {
        avatar_base64: avatar,
      }
    );
  }

  // 上傳用戶頭像 (FormData 格式)
  async uploadAvatar(formData: FormData): Promise<ApiResponse> {
    try {
      // 從 FormData 中獲取文件並轉換為 base64
      const file = formData.get('avatar') as File;
      if (!file) {
        return {
          error: "未找到頭像文件",
          status: 400,
        };
      }

      // 將文件轉換為 base64 data URL
      const base64 = await this.fileToBase64(file);
      
      // 使用 JSON 格式發送數據
      return this.put(
        `${API_CONFIG.SETTING.BASE_URL}${API_CONFIG.SETTING.ENDPOINTS.UPDATE_AVATAR}`,
        {
          avatar_base64: base64,
        }
      );
    } catch (error) {
      return {
        error: "頭像處理失敗",
        status: 0,
      };
    }
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

  // 刪除用戶頭像
  async deleteAvatar(): Promise<ApiResponse> {
    return this.delete(
      `${API_CONFIG.SETTING.BASE_URL}${API_CONFIG.SETTING.ENDPOINTS.DELETE_AVATAR}`
    );
  }

  // 修改密碼
  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse> {
    return this.post(
      `${API_CONFIG.SETTING.BASE_URL}${API_CONFIG.SETTING.ENDPOINTS.CHANGE_PASSWORD}`,
      {
        current_password: oldPassword,
        new_password: newPassword,
      }
    );
  }

  // 刪除帳號
  async deleteAccount(): Promise<ApiResponse> {
    return this.delete(
      `${API_CONFIG.SETTING.BASE_URL}${API_CONFIG.SETTING.ENDPOINTS.DELETE_ACCOUNT}`
    );
  }

  // 重新發送驗證email (Auth API)
  async resendVerificationEmail(username: string): Promise<ApiResponse> {
    return this.post(`${API_CONFIG.AUTH.BASE_URL}/resend_verification`, {
      username,
    });
  }

  // 重新發送Setting API的email驗證
  async resendEmailVerification(): Promise<ApiResponse> {
    return this.post(
      `${API_CONFIG.SETTING.BASE_URL}${API_CONFIG.SETTING.ENDPOINTS.RESEND_EMAIL_VERIFICATION}`
    );
  }

  // 檢查email驗證狀態
  async checkEmailVerification(): Promise<ApiResponse> {
    return this.get(
      `${API_CONFIG.SETTING.BASE_URL}${API_CONFIG.SETTING.ENDPOINTS.CHECK_EMAIL_VERIFICATION}`
    );
  }

  // Bot 管理相關 API
  // 獲取用戶的所有 bot
  async getBots(): Promise<ApiResponse> {
    return this.get(
      `${API_CONFIG.PUZZLE.BASE_URL}${API_CONFIG.PUZZLE.ENDPOINTS.GET_BOTS}`
    );
  }

  // 創建新的 bot
  async createBot(botData: {
    name: string;
    channel_token: string;
    channel_secret: string;
  }): Promise<ApiResponse> {
    return this.post(
      `${API_CONFIG.PUZZLE.BASE_URL}${API_CONFIG.PUZZLE.ENDPOINTS.CREATE_BOT}`,
      botData
    );
  }

  // 更新 bot
  async updateBot(
    botId: string,
    botData: { name?: string; channel_token?: string; channel_secret?: string }
  ): Promise<ApiResponse> {
    return this.put(
      `${API_CONFIG.PUZZLE.BASE_URL}${API_CONFIG.PUZZLE.ENDPOINTS.UPDATE_BOT(botId)}`,
      botData
    );
  }

  // 刪除 bot
  async deleteBot(botId: string): Promise<ApiResponse> {
    return this.delete(
      `${API_CONFIG.PUZZLE.BASE_URL}${API_CONFIG.PUZZLE.ENDPOINTS.DELETE_BOT(botId)}`
    );
  }

  // 獲取單個 bot
  async getBot(botId: string): Promise<ApiResponse> {
    return this.get(`${API_CONFIG.PUZZLE.BASE_URL}/${botId}`);
  }
}
