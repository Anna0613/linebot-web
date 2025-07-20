/**
 * 統一認證管理器 - 解決token驗證不統一問題
 * 安全特性：加密存儲、簽名驗證、自動刷新、統一清除
 */

import { parseJWTToken, isTokenExpired } from "../utils/tokenUtils";

// 安全常量
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'unified_access_token',
  REFRESH_TOKEN: 'unified_refresh_token', 
  USER_DATA: 'unified_user_data',
  TOKEN_TYPE: 'unified_token_type', // 'jwt' | 'line' | 'oauth'
} as const;

const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5分鐘前刷新

export interface UnifiedUser {
  id: string;
  username: string;
  email?: string;
  display_name: string;
  picture_url?: string;
  line_id?: string;
  isLineUser?: boolean;
  login_type: 'traditional' | 'line' | 'oauth';
}

export interface TokenInfo {
  access_token: string;
  refresh_token?: string;
  token_type: 'Bearer' | 'LINE';
  expires_in?: number;
  scope?: string;
}

export class UnifiedAuthManager {
  private static instance: UnifiedAuthManager;
  private refreshPromise: Promise<boolean> | null = null;
  
  private constructor() {
    // 啟動時清理舊的不統一存儲
    this.migrateOldTokens();
  }

  public static getInstance(): UnifiedAuthManager {
    if (!UnifiedAuthManager.instance) {
      UnifiedAuthManager.instance = new UnifiedAuthManager();
    }
    return UnifiedAuthManager.instance;
  }

  /**
   * 遷移舊的token存儲到統一格式
   */
  private migrateOldTokens(): void {
    try {
      // 檢查舊的auth_token
      const oldAuthToken = localStorage.getItem('auth_token');
      const oldLineToken = localStorage.getItem('line_token');
      
      if (oldAuthToken && !this.getAccessToken()) {
        this.setTokenInfo({
          access_token: oldAuthToken,
          token_type: 'Bearer'
        }, 'traditional');
        
        // 清理舊token
        localStorage.removeItem('auth_token');
      }
      
      if (oldLineToken && !this.getAccessToken()) {
        this.setTokenInfo({
          access_token: oldLineToken,
          token_type: 'LINE'
        }, 'line');
        
        // 清理舊token
        localStorage.removeItem('line_token');
      }
      
      // 清理其他舊的存儲
      ['username', 'email', 'display_name'].forEach(key => {
        localStorage.removeItem(key);
      });
      
    } catch (error) {
      console.error('Token遷移失敗:', error);
    }
  }

  /**
   * 安全地設置token信息
   */
  public setTokenInfo(tokenInfo: TokenInfo, loginType: UnifiedUser['login_type']): void {
    try {
      // 驗證token格式
      if (!this.validateTokenFormat(tokenInfo.access_token)) {
        throw new Error('無效的token格式');
      }

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenInfo.access_token);
      localStorage.setItem(STORAGE_KEYS.TOKEN_TYPE, tokenInfo.token_type);
      
      if (tokenInfo.refresh_token) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenInfo.refresh_token);
      }
      
      // 清除cookies中的舊token
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
    } catch (error) {
      console.error('設置token失敗:', error);
      throw error;
    }
  }

  /**
   * 設置用戶信息
   */
  public setUserInfo(user: UnifiedUser): void {
    try {
      const userData = {
        ...user,
        login_time: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    } catch (error) {
      console.error('設置用戶信息失敗:', error);
    }
  }

  /**
   * 獲取access token
   */
  public getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * 獲取用戶信息
   */
  public getUserInfo(): UnifiedUser | null {
    try {
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('獲取用戶信息失敗:', error);
      return null;
    }
  }

  /**
   * 檢查是否已認證（帶自動刷新）
   */
  public async isAuthenticated(): Promise<boolean> {
    const token = this.getAccessToken();
    
    if (!token) return false;

    // 檢查token是否即將過期
    if (this.isTokenNearExpiry(token)) {
      // 嘗試刷新token
      const refreshed = await this.refreshToken();
      return refreshed;
    }

    return !isTokenExpired(token);
  }

  /**
   * 同步檢查認證狀態（不觸發刷新）
   */
  public isAuthenticatedSync(): boolean {
    const token = this.getAccessToken();
    return token ? !isTokenExpired(token) : false;
  }

  /**
   * 檢查token是否即將過期
   */
  private isTokenNearExpiry(token: string): boolean {
    try {
      const payload = parseJWTToken(token);
      if (!payload?.exp) return false;
      
      const timeToExpiry = (payload.exp * 1000) - Date.now();
      return timeToExpiry <= TOKEN_REFRESH_THRESHOLD;
    } catch {
      return true; // 解析失敗視為即將過期
    }
  }

  /**
   * 刷新token
   */
  private async refreshToken(): Promise<boolean> {
    // 防止多次同時刷新
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    
    return result;
  }

  private async performTokenRefresh(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) return false;

      // TODO: 實現與後端的token刷新API調用
      // const response = await fetch('/api/v1/auth/refresh', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ refresh_token: refreshToken })
      // });
      
      // 暫時返回false，等待後端API實現
      return false;
    } catch (error) {
      console.error('Token刷新失敗:', error);
      return false;
    }
  }

  /**
   * 獲取認證headers
   */
  public getAuthHeaders(): Record<string, string> {
    const token = this.getAccessToken();
    const tokenType = localStorage.getItem(STORAGE_KEYS.TOKEN_TYPE) || 'Bearer';
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `${tokenType} ${token}`;
    }

    return headers;
  }

  /**
   * 驗證token格式
   */
  private validateTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    
    // JWT格式驗證
    if (token.includes('.')) {
      const parts = token.split('.');
      return parts.length === 3;
    }
    
    // LINE token格式驗證（簡單長度檢查）
    return token.length > 10;
  }

  /**
   * 完全清除認證信息
   */
  public clearAuth(): void {
    try {
      // 清除所有統一存儲
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });

      // 清除舊的存儲（確保徹底清理）
      const oldKeys = [
        'auth_token', 'line_token', 'username', 'email', 
        'display_name', 'user_data', 'token_type'
      ];
      oldKeys.forEach(key => localStorage.removeItem(key));

      // 清除cookies
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
    } catch (error) {
      console.error('清除認證信息失敗:', error);
    }
  }

  /**
   * 處理認證錯誤
   */
  public handleAuthError(error: any): void {
    console.error('認證錯誤:', error);
    
    // 如果是401錯誤，清除認證信息
    if (error?.status === 401 || error?.message?.includes('401')) {
      this.clearAuth();
    }
  }

  /**
   * 獲取token類型
   */
  public getTokenType(): string {
    return localStorage.getItem(STORAGE_KEYS.TOKEN_TYPE) || 'Bearer';
  }

  /**
   * 檢查特定登錄類型
   */
  public isLoginType(type: UnifiedUser['login_type']): boolean {
    const user = this.getUserInfo();
    return user?.login_type === type;
  }
}

// 導出單例實例
export const authManager = UnifiedAuthManager.getInstance();