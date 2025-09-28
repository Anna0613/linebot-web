/**
 * 認證輪詢管理器 - 基於 GitHub 最佳實踐
 * 
 * 參考：texm/shokku 專案的認證刷新模式
 * - 智能檢查：只在接近過期時才刷新
 * - 避免重複請求：防止多個組件同時觸發認證檢查
 * - 錯誤處理：網路錯誤時的重試機制
 */

interface AuthStatus {
  isAuthenticated: boolean;
  expiresAt?: number;
  lastChecked: number;
}

interface AuthPollingConfig {
  /** 檢查間隔（毫秒） */
  checkInterval: number;
  /** 刷新緩衝時間（毫秒） - 在過期前多久開始刷新 */
  refreshBuffer: number;
  /** 快取有效時間（毫秒） */
  cacheTimeout: number;
  /** 最大重試次數 */
  maxRetries: number;
}

class AuthPollingManager {
  private static instance: AuthPollingManager;
  private intervalId: NodeJS.Timeout | null = null;
  private authStatus: AuthStatus | null = null;
  private isChecking = false;
  private retryCount = 0;
  private listeners: Set<() => void> = new Set();

  private config: AuthPollingConfig = {
    checkInterval: 5 * 60 * 1000,  // 5 分鐘檢查間隔
    refreshBuffer: 2 * 60 * 1000,  // 2 分鐘緩衝時間
    cacheTimeout: 30 * 1000,       // 30 秒快取
    maxRetries: 3
  };

  private constructor() {}

  static getInstance(): AuthPollingManager {
    if (!AuthPollingManager.instance) {
      AuthPollingManager.instance = new AuthPollingManager();
    }
    return AuthPollingManager.instance;
  }

  /**
   * 配置輪詢參數
   */
  configure(config: Partial<AuthPollingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 開始認證輪詢
   */
  start(): void {
    if (this.intervalId) {
      this.stop();
    }

    // 立即檢查一次
    this.checkAuth();

    // 設置定期檢查
    this.intervalId = setInterval(() => {
      this.checkAuth();
    }, this.config.checkInterval);

    console.log(`[AuthPollingManager] Started with ${this.config.checkInterval / 1000}s interval`);
  }

  /**
   * 停止認證輪詢
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[AuthPollingManager] Stopped');
    }
  }

  /**
   * 添加狀態變更監聽器
   */
  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * 獲取當前認證狀態
   */
  getAuthStatus(): AuthStatus | null {
    return this.authStatus;
  }

  /**
   * 強制刷新認證狀態
   */
  async forceRefresh(): Promise<void> {
    this.authStatus = null;
    await this.checkAuth();
  }

  /**
   * 檢查認證狀態
   */
  private async checkAuth(): Promise<void> {
    // 防止重複檢查
    if (this.isChecking) {
      return;
    }

    // 檢查快取是否仍然有效
    if (this.authStatus && this.isCacheValid()) {
      return;
    }

    this.isChecking = true;

    try {
      const { API_CONFIG, getApiUrl } = await import('../config/apiConfig');
      const response = await fetch(
        getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.CHECK_LOGIN),
        {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        this.authStatus = {
          isAuthenticated: data.authenticated || false,
          expiresAt: data.expiresAt ? new Date(data.expiresAt).getTime() : undefined,
          lastChecked: Date.now()
        };

        this.retryCount = 0;
        this.notifyListeners();

        // 檢查是否需要刷新
        if (this.shouldRefreshToken()) {
          await this.refreshToken();
        }
      } else {
        throw new Error(`Auth check failed: ${response.status}`);
      }
    } catch (error) {
      console.error('[AuthPollingManager] Auth check failed:', error);
      
      this.retryCount++;
      if (this.retryCount <= this.config.maxRetries) {
        // 指數退避重試
        const retryDelay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
        setTimeout(() => this.checkAuth(), retryDelay);
      } else {
        // 重試次數用盡，標記為未認證
        this.authStatus = {
          isAuthenticated: false,
          lastChecked: Date.now()
        };
        this.notifyListeners();
      }
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 檢查快取是否仍然有效
   */
  private isCacheValid(): boolean {
    if (!this.authStatus) return false;
    
    const now = Date.now();
    return (now - this.authStatus.lastChecked) < this.config.cacheTimeout;
  }

  /**
   * 檢查是否應該刷新 Token
   */
  private shouldRefreshToken(): boolean {
    if (!this.authStatus?.expiresAt) return false;
    
    const now = Date.now();
    const timeUntilExpiry = this.authStatus.expiresAt - now;
    
    return timeUntilExpiry <= this.config.refreshBuffer;
  }

  /**
   * 刷新認證 Token
   */
  private async refreshToken(): Promise<void> {
    try {
      const { API_CONFIG, getApiUrl } = await import('../config/apiConfig');
      const response = await fetch(
        getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.REFRESH),
        {
          method: 'POST',
          credentials: 'include'
        }
      );

      if (response.ok) {
        console.log('[AuthPollingManager] Token refreshed successfully');
        // 刷新成功後重新檢查狀態
        this.authStatus = null;
        await this.checkAuth();
      } else {
        console.warn('[AuthPollingManager] Token refresh failed:', response.status);
      }
    } catch (error) {
      console.error('[AuthPollingManager] Token refresh error:', error);
    }
  }

  /**
   * 通知所有監聽器
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[AuthPollingManager] Listener error:', error);
      }
    });
  }
}

export default AuthPollingManager;

/**
 * React Hook 用於使用認證輪詢管理器
 */
export const useAuthPollingManager = () => {
  const manager = AuthPollingManager.getInstance();
  
  return {
    start: () => manager.start(),
    stop: () => manager.stop(),
    forceRefresh: () => manager.forceRefresh(),
    getAuthStatus: () => manager.getAuthStatus(),
    addListener: (callback: () => void) => manager.addListener(callback),
    configure: (config: Partial<AuthPollingConfig>) => manager.configure(config)
  };
};
