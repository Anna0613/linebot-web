/**
 * 統一認證管理器 - 安全的 Cookie-based 認證管理
 * 安全特性：HttpOnly cookies、防 XSS、自動刷新、統一清除
 */

import { parseJWTToken, isTokenExpired } from "../utils/tokenUtils";
import {
  setAuthToken,
  getAuthToken,
  getTokenType,
  setRefreshToken,
  getRefreshToken,
  setUserData,
  getUserData,
  clearAllAuthCookies,
  getAuthHeaders,
  isRememberMeActive,
  extendAuthCookies,
  hasValidAuth
} from "../utils/cookieUtils";
import { cacheService, CACHE_KEYS, CACHE_TTL } from "./CacheService";

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
  rememberMe?: boolean; // 新增記住我選項
}

export class UnifiedAuthManager {
  private static instance: UnifiedAuthManager;
  private refreshPromise: Promise<boolean> | null = null;
  
  private constructor() {
    // 啟動時清理舊的不統一存儲
    this.migrateOldTokens();
    // 初始化快取服務
    this.initializeCache();
  }

  public static getInstance(): UnifiedAuthManager {
    if (!UnifiedAuthManager.instance) {
      UnifiedAuthManager.instance = new UnifiedAuthManager();
    }
    return UnifiedAuthManager.instance;
  }

  /**
   * 遷移舊的token存儲到統一格式，清除不兼容的舊格式
   */
  private migrateOldTokens(): void {
    try {
      // 檢查舊的 localStorage token
      const oldAuthToken = localStorage.getItem('auth_token') || localStorage.getItem('unified_access_token');
      const oldLineToken = localStorage.getItem('line_token');
      const oldUserData = localStorage.getItem('unified_user_data') || localStorage.getItem('user_data');
      
      // 檢查 Token 格式是否兼容（新格式應該有 "sub" 字段，不應該有 "data" 字段）
      const isTokenCompatible = (token: string): boolean => {
        try {
          const payload = parseJWTToken(token);
          // 新格式：有 "sub" 字段且沒有 "data" 字段
          return payload?.sub && !payload?.data;
        } catch {
          return false;
        }
      };
      
      if (oldAuthToken && !getAuthToken()) {
        if (isTokenCompatible(oldAuthToken)) {
          // 只遷移兼容的新格式 Token
          setAuthToken(oldAuthToken, false, 'Bearer');
          console.log('已將舊 localStorage token 遷移到 cookie');
        } else {
          console.warn('發現不兼容的舊格式 token，將被清除');
          clearAllAuthCookies(); // 確保清除所有認證資料
        }
      }
      
      if (oldLineToken && !getAuthToken()) {
        if (isTokenCompatible(oldLineToken)) {
          setAuthToken(oldLineToken, false, 'LINE');
          console.log('已將舊 LINE token 遷移到 cookie');
        } else {
          console.warn('發現不兼容的舊格式 LINE token，將被清除');
          clearAllAuthCookies();
        }
      }
      
      if (oldUserData && !getUserData()) {
        try {
          const userData = JSON.parse(oldUserData);
          setUserData(userData, false);
          console.log('已將舊用戶資料遷移到 cookie');
        } catch (_err) {
          console.warn('舊用戶資料格式錯誤，跳過遷移');
        }
      }
      
      // 清理所有舊的 localStorage 項目
      const oldKeys = [
        'auth_token', 'line_token', 'username', 'email', 'display_name',
        'unified_access_token', 'unified_refresh_token', 'unified_user_data',
        'unified_token_type', 'user_data', 'token_type', 'token' // 加上 'token' key
      ];
      
      oldKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log('舊 localStorage 資料清理完成');
    } catch (error) {
      console.error("Token 遷移過程中發生錯誤:", error);
      // 發生錯誤時清除所有認證資料以確保安全
      clearAllAuthCookies();
    }
  }

  /**
   * 安全地設定token信息到 cookies
   */
  public setTokenInfo(tokenInfo: TokenInfo, loginType: UnifiedUser['login_type'], rememberMe = false): void {
    try {
      // 驗證token格式
      if (!this.validateTokenFormat(tokenInfo.access_token)) {
        throw new Error('無效的token格式');
      }

      // 使用 cookie 工具設定 token
      setAuthToken(tokenInfo.access_token, rememberMe, tokenInfo.token_type);
      
      // 如果有 refresh token，也要設定
      if (tokenInfo.refresh_token) {
        setRefreshToken(tokenInfo.refresh_token);
      }
      
      console.log(`Token 已設定 - 類型: ${tokenInfo.token_type}, 記住我: ${rememberMe}`);
    } catch (error) {
      console.error("Error occurred:", error);
      throw error;
    }
  }

  /**
   * 設定用戶信息到 cookies 和快取
   */
  public setUserInfo(user: UnifiedUser, rememberMe = false): void {
    try {
      const userData = {
        ...user,
        login_time: Date.now()
      };
      
      // 設定到 cookie
      setUserData(userData, rememberMe);
      
      // 設定到記憶體快取
      cacheService.set(CACHE_KEYS.USER_DATA, userData, CACHE_TTL.USER_DATA);
      
      console.log(`用戶資料已設定 - 記住我: ${rememberMe}`);
    } catch (error) {
      console.error("Error occurred:", error);
    }
  }

  /**
   * 獲取access token from cookies
   */
  public getAccessToken(): string | null {
    return getAuthToken();
  }

  /**
   * 獲取用戶信息 from 快取或 cookies
   */
  public getUserInfo(): UnifiedUser | null {
    try {
      // 首先從快取獲取
      const cachedUserData = cacheService.get<UnifiedUser>(CACHE_KEYS.USER_DATA);
      if (cachedUserData) {
        return cachedUserData;
      }
      
      // 快取未命中，從 cookie 獲取並更新快取
      const userData = getUserData() as UnifiedUser | null;
      if (userData) {
        cacheService.set(CACHE_KEYS.USER_DATA, userData, CACHE_TTL.USER_DATA);
      }
      
      return userData;
    } catch (error) {
      console.error("Error occurred:", error);
      return null;
    }
  }

  /**
   * 檢查是否已認證（帶自動刷新和快取）
   */
  public async isAuthenticated(): Promise<boolean> {
    // 首先檢查快取的認證狀態
    const cachedAuthStatus = cacheService.get<boolean>(CACHE_KEYS.AUTH_STATUS);
    if (cachedAuthStatus !== null) {
      // 如果快取顯示已認證，還需要檢查 token 是否真的有效
      const token = this.getAccessToken();
      if (token && !isTokenExpired(token) && !this.isTokenNearExpiry(token)) {
        return true;
      }
      // 如果 token 無效或即將過期，清除快取狀態
      cacheService.delete(CACHE_KEYS.AUTH_STATUS);
    }
    
    const token = this.getAccessToken();
    
    if (!token) {
      cacheService.set(CACHE_KEYS.AUTH_STATUS, false, CACHE_TTL.AUTH_STATUS);
      return false;
    }

    // 檢查token是否即將過期
    if (this.isTokenNearExpiry(token)) {
      // 嘗試刷新token
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // 如果是記住我模式，延長 cookie 過期時間
        if (isRememberMeActive()) {
          extendAuthCookies();
        }
        cacheService.set(CACHE_KEYS.AUTH_STATUS, true, CACHE_TTL.AUTH_STATUS);
      } else {
        cacheService.set(CACHE_KEYS.AUTH_STATUS, false, CACHE_TTL.AUTH_STATUS);
      }
      return refreshed;
    }

    const isValid = !isTokenExpired(token);
    cacheService.set(CACHE_KEYS.AUTH_STATUS, isValid, CACHE_TTL.AUTH_STATUS);
    return isValid;
  }

  /**
   * 同步檢查認證狀態（不觸發刷新）
   */
  public isAuthenticatedSync(): boolean {
    return hasValidAuth() && !isTokenExpired(this.getAccessToken()!);
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
  public async refreshToken(): Promise<boolean> {
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
      const refreshToken = getRefreshToken();
      
      if (!refreshToken) {
        console.log('沒有 refresh token，無法刷新');
        return false;
      }

      // 調用後端的 refresh API
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include', // 自動攜帶 cookies
      });

      if (!response.ok) {
        console.error('Token 刷新失敗:', response.status, response.statusText);
        
        // 如果是 401，表示 refresh token 也過期了，調用 refresh 失效處理
        if (response.status === 401) {
          this.handleRefreshFailure();
        }
        return false;
      }

      const tokenData = await response.json();
      
      // 更新 token 信息
      if (tokenData.access_token) {
        setAuthToken(tokenData.access_token, true, tokenData.token_type || 'Bearer'); // refresh 的都是記住我模式
        
        if (tokenData.refresh_token) {
          setRefreshToken(tokenData.refresh_token);
        }
        
        // 如果有用戶信息，也更新
        if (tokenData.user) {
          setUserData(tokenData.user, true);
          // 更新快取
          cacheService.set(CACHE_KEYS.USER_DATA, tokenData.user, CACHE_TTL.USER_DATA);
        }
        
        console.log('Token 刷新成功');
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error occurred:", error);
      return false;
    }
  }

  /**
   * 獲取認證headers from cookies
   */
  public getAuthHeaders(): Record<string, string> {
    return getAuthHeaders();
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
   * 完全清除認證信息（cookies + localStorage + 記憶體快取）
   */
  public clearAuth(reason: 'logout' | 'expired' | 'refresh_failed' = 'expired'): void {
    try {
      // 清除所有認證 cookies
      clearAllAuthCookies();
      
      // 清除可能殘留的 localStorage（確保徹底清理）
      const oldKeys = [
        'auth_token', 'line_token', 'username', 'email', 'display_name',
        'user_data', 'token_type', 'unified_access_token', 'unified_refresh_token',
        'unified_user_data', 'unified_token_type'
      ];
      oldKeys.forEach(key => localStorage.removeItem(key));
      
      // 清除快取中的認證相關資料
      cacheService.clearPattern('^auth:');
      cacheService.clearPattern('^bots:');
      
      // 派發清理事件
      if (reason === 'logout') {
        this.dispatchAuthEvent('user_logout', {
          message: '用戶主動登出',
          clearAll: true
        });
      }
      
      console.log(`所有認證資料已清除（包括快取）- 原因: ${reason}`);
    } catch (error) {
      console.error("Error occurred:", error);
    }
  }

  /**
   * 處理認證錯誤（增強快取清理）
   */
  public handleAuthError(error: unknown): void {
    console.error("Error occurred:", error);
    
    // 如果是401錯誤，根據記住我狀態決定處理方式
    if (error && typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>;
      const is401Error = errorObj.status === 401 || 
          (typeof errorObj.message === 'string' && errorObj.message.includes('401'));
      
      if (is401Error) {
        const isRememberMe = this.isRememberMeActive();
        
        // 清除認證快取狀態
        cacheService.delete(CACHE_KEYS.AUTH_STATUS);
        
        if (isRememberMe) {
          // 記住我模式下，不立即清除認證信息
          // 可能只是 access token 過期，refresh token 可能還有效
          console.log('記住我模式下的認證錯誤，保留用戶狀態，嘗試自動恢復');
          
          // 可以在這裡觸發一個事件，讓 UI 顯示「正在恢復會話」的提示
          this.dispatchAuthEvent('auth_recovery_needed', {
            message: '會話過期，正在嘗試自動恢復...',
            isRememberMe: true
          });
        } else {
          // 非記住我模式，直接清除認證信息和所有快取
          console.log('非記住我模式的認證錯誤，清除認證信息');
          this.clearAuth();
          
          this.dispatchAuthEvent('auth_expired', {
            message: '會話已過期，請重新登入',
            isRememberMe: false
          });
        }
      }
    }
  }
  
  /**
   * 當 refresh token 也失效時的處理
   */
  public handleRefreshFailure(): void {
    console.log('Refresh token 失效，清除所有認證信息');
    // 清除快取中的認證狀態
    cacheService.delete(CACHE_KEYS.AUTH_STATUS);
    cacheService.clearPattern('^auth:');
    this.clearAuth('refresh_failed');
    
    this.dispatchAuthEvent('auth_refresh_failed', {
      message: '認證已過期，請重新登入',
      isRememberMe: true
    });
  }
  
  /**
   * 派發認證相關事件
   */
  private dispatchAuthEvent(eventType: string, detail: Record<string, unknown>): void {
    try {
      const event = new CustomEvent(eventType, { detail });
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Error occurred:", error);
    }
  }

  /**
   * 獲取token類型 from cookies
   */
  public getTokenType(): string {
    return getTokenType();
  }

  /**
   * 檢查特定登錄類型
   */
  public isLoginType(type: UnifiedUser['login_type']): boolean {
    const user = this.getUserInfo();
    return user?.login_type === type;
  }

  /**
   * 檢查是否為記住我狀態
   */
  public isRememberMeActive(): boolean {
    return isRememberMeActive();
  }

  /**
   * 延長認證 cookies（用於活動時自動延長）
   */
  public extendAuthCookies(): void {
    extendAuthCookies();
    // 同時延長快取中的認證狀態
    cacheService.set(CACHE_KEYS.AUTH_STATUS, true, CACHE_TTL.AUTH_STATUS);
  }

  /**
   * 初始化快取服務
   */
  private initializeCache(): void {
    try {
      // 如果已有用戶資料，預填充快取
      const userData = getUserData();
      if (userData) {
        cacheService.set(CACHE_KEYS.USER_DATA, userData, CACHE_TTL.USER_DATA);
      }
      
      console.log('快取服務初始化完成');
    } catch (error) {
      console.error('快取服務初始化失敗:', error);
    }
  }

  /**
   * 手動刷新用戶資料快取
   */
  public refreshUserDataCache(): void {
    try {
      const userData = getUserData();
      if (userData) {
        cacheService.set(CACHE_KEYS.USER_DATA, userData, CACHE_TTL.USER_DATA);
        console.log('用戶資料快取已刷新');
      }
    } catch (error) {
      console.error('刷新用戶資料快取失敗:', error);
    }
  }

  /**
   * 獲取快取統計資訊（用於偵錯）
   */
  public getCacheStats() {
    return cacheService.getStats();
  }
}

// 導出單例實例
export const authManager = UnifiedAuthManager.getInstance();