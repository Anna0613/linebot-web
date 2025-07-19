import { API_CONFIG, getApiUrl } from "../config/apiConfig";
import { AuthService } from "./auth";

export interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string;
  email?: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    access_token?: string;
    user?: User;
  };
}

export class AuthenticationService {
  private static instance: AuthenticationService;

  public static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  /**
   * 驗證 LINE 登入 token
   */
  async verifyLineToken(token: string): Promise<User | null> {
    try {
      const response = await fetch(
        getApiUrl(
          API_CONFIG.LINE_LOGIN.BASE_URL,
          API_CONFIG.LINE_LOGIN.ENDPOINTS.VERIFY_TOKEN
        ),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );

      if (!response.ok) {
        throw new Error("Token 驗證失敗");
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return result as User;
    } catch (error) {
      console.error("驗證 LINE token 錯誤:", error);
      return null;
    }
  }

  /**
   * 檢查當前登入狀態
   */
  async checkLoginStatus(): Promise<User | null> {
    try {
      const nativeFetch = window.fetch.bind(window);
      const response = await nativeFetch(
        getApiUrl(
          API_CONFIG.AUTH.BASE_URL,
          API_CONFIG.AUTH.ENDPOINTS.CHECK_LOGIN
        ),
        {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(AuthService.getToken() && {
              Authorization: `Bearer ${AuthService.getToken()}`,
            }),
          },
        }
      );

      if (!response.ok) {
        throw new Error("檢查登入狀態失敗");
      }

      const data = await response.json();

      // 處理新格式 API 回應
      if (data.authenticated && data.user) {
        return {
          display_name: data.user.username,
          username: data.user.username,
          email: data.user.email,
        };
      }

      // 處理舊格式回應 (向後兼容)
      if (data.message && typeof data.message === "string") {
        const messagePattern = /User (.+?) is logged in/;
        const match = data.message.match(messagePattern);

        if (match && match[1]) {
          return {
            display_name: match[1],
            username: match[1],
          };
        }
      }

      // 明確的未登入狀態
      if (data.authenticated === false) {
        return null;
      }

      throw new Error("無效的 API 回應格式");
    } catch (error) {
      console.error("檢查登入狀態錯誤:", error);
      return null;
    }
  }

  /**
   * 設置用戶會話信息
   */
  setUserSession(user: User, token?: string): void {
    if (token) {
      AuthService.setToken(token);
    }

    // 設置 LINE 相關信息
    if (user.line_id) {
      localStorage.setItem("line_token", token || "");
    }

    localStorage.setItem("username", user.display_name);

    if (user.email) {
      localStorage.setItem("email", user.email);
    }
  }

  /**
   * 清除用戶會話
   */
  clearUserSession(): void {
    AuthService.clearToken();
    localStorage.removeItem("line_token");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("auth_token");
  }

  /**
   * 獲取當前用戶信息
   */
  getCurrentUser(): User | null {
    const username = localStorage.getItem("username");
    const email = localStorage.getItem("email");

    if (!username) {
      return null;
    }

    return {
      display_name: username,
      username,
      email: email || undefined,
    };
  }

  /**
   * 檢查是否已認證
   */
  isAuthenticated(): boolean {
    return AuthService.isAuthenticated() || !!localStorage.getItem("username");
  }

  /**
   * 處理 LINE 登入成功
   */
  async handleLineLoginSuccess(token: string): Promise<User | null> {
    const userData = await this.verifyLineToken(token);

    if (userData) {
      this.setUserSession(userData, token);
      // 清除登入前的歷史記錄
      window.history.replaceState(null, "", window.location.pathname);
    }

    return userData;
  }

  /**
   * 處理傳統登入成功
   */
  handleLoginSuccess(response: LoginResponse): User | null {
    if (!response.success) {
      throw new Error(response.message || "登入失敗");
    }

    // 設置 token
    if (response.data?.access_token) {
      AuthService.setToken(response.data.access_token);
    }

    // 設置用戶信息
    if (response.data?.user) {
      this.setUserSession(response.data.user);
      return response.data.user;
    }

    return null;
  }
}
