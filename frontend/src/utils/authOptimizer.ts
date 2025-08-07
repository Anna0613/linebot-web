/**
 * 認證檢查優化工具 - 減少重複的認證驗證調用
 */

import { authManager } from '../services/UnifiedAuthManager';
import { cacheService } from '../services/CacheService';

export interface AuthCheckResult {
  isAuthenticated: boolean;
  fromCache: boolean;
  timestamp: number;
}

export class AuthOptimizer {
  private static instance: AuthOptimizer;
  private pendingChecks: Map<string, Promise<boolean>> = new Map();

  private constructor() {}

  public static getInstance(): AuthOptimizer {
    if (!AuthOptimizer.instance) {
      AuthOptimizer.instance = new AuthOptimizer();
    }
    return AuthOptimizer.instance;
  }

  /**
   * 優化的認證檢查 - 避免併發檢查和重複驗證
   */
  public async checkAuthenticationOptimized(context: string = 'default'): Promise<AuthCheckResult> {
    const now = Date.now();
    
    // 檢查是否有相同上下文的待處理檢查
    const pendingKey = `auth_check_${context}`;
    const existingPromise = this.pendingChecks.get(pendingKey);
    
    if (existingPromise) {
      console.debug(`等待現有的認證檢查完成 - 上下文: ${context}`);
      const result = await existingPromise;
      return {
        isAuthenticated: result,
        fromCache: true,
        timestamp: now
      };
    }

    // 檢查短期快取（避免過於頻繁的檢查）
    const recentCheck = cacheService.get<AuthCheckResult>(`auth_recent_${context}`);
    if (recentCheck && (now - recentCheck.timestamp) < 5000) { // 5 秒內的檢查視為有效
      console.debug(`使用最近的認證檢查結果 - 上下文: ${context}`);
      return {
        ...recentCheck,
        fromCache: true
      };
    }

    // 執行新的認證檢查
    const authPromise = this.performAuthCheck();
    this.pendingChecks.set(pendingKey, authPromise);

    try {
      const isAuth = await authPromise;
      const result: AuthCheckResult = {
        isAuthenticated: isAuth,
        fromCache: false,
        timestamp: now
      };

      // 快取結果
      cacheService.set(`auth_recent_${context}`, result, 30 * 1000); // 30 秒快取

      return result;
    } finally {
      // 清理待處理的檢查
      this.pendingChecks.delete(pendingKey);
    }
  }

  /**
   * 執行實際的認證檢查
   */
  private async performAuthCheck(): Promise<boolean> {
    try {
      return await authManager.isAuthenticated();
    } catch (error) {
      console.error('認證檢查失敗:', error);
      return false;
    }
  }

  /**
   * 同步認證檢查（不觸發網路請求）
   */
  public checkAuthenticationSync(): AuthCheckResult {
    const now = Date.now();
    const isAuth = authManager.isAuthenticatedSync();
    
    return {
      isAuthenticated: isAuth,
      fromCache: true,
      timestamp: now
    };
  }

  /**
   * 清除認證檢查快取
   */
  public clearAuthCheckCache(context?: string): void {
    if (context) {
      cacheService.delete(`auth_recent_${context}`);
      this.pendingChecks.delete(`auth_check_${context}`);
    } else {
      // 清除所有認證檢查快取
      cacheService.clearPattern('^auth_recent_');
      this.pendingChecks.clear();
    }
  }

  /**
   * 批次認證檢查 - 用於多個組件同時需要認證狀態時
   */
  public async batchAuthCheck(contexts: string[]): Promise<Map<string, AuthCheckResult>> {
    const results = new Map<string, AuthCheckResult>();
    
    // 分組：同步檢查和異步檢查
    const syncContexts: string[] = [];
    const asyncContexts: string[] = [];
    
    contexts.forEach(context => {
      const recent = cacheService.get<AuthCheckResult>(`auth_recent_${context}`);
      if (recent && (Date.now() - recent.timestamp) < 5000) {
        results.set(context, { ...recent, fromCache: true });
      } else if (authManager.isAuthenticatedSync()) {
        syncContexts.push(context);
      } else {
        asyncContexts.push(context);
      }
    });

    // 處理同步檢查
    const syncResult = this.checkAuthenticationSync();
    syncContexts.forEach(context => {
      results.set(context, syncResult);
      cacheService.set(`auth_recent_${context}`, syncResult, 30 * 1000);
    });

    // 處理異步檢查（併發執行）
    if (asyncContexts.length > 0) {
      const asyncPromises = asyncContexts.map(context => 
        this.checkAuthenticationOptimized(context)
      );
      
      const asyncResults = await Promise.all(asyncPromises);
      asyncContexts.forEach((context, index) => {
        results.set(context, asyncResults[index]);
      });
    }

    return results;
  }

  /**
   * 預熱認證檢查 - 在應用啟動時預先檢查
   */
  public async preloadAuthStatus(): Promise<void> {
    try {
      console.debug('預熱認證狀態檢查');
      await this.checkAuthenticationOptimized('preload');
    } catch (error) {
      console.warn('預熱認證狀態失敗:', error);
    }
  }

  /**
   * 獲取待處理的檢查統計
   */
  public getPendingChecksStats(): {
    count: number;
    contexts: string[];
  } {
    return {
      count: this.pendingChecks.size,
      contexts: Array.from(this.pendingChecks.keys())
    };
  }

  /**
   * 重置優化器狀態
   */
  public reset(): void {
    this.pendingChecks.clear();
    cacheService.clearPattern('^auth_recent_');
    console.debug('認證優化器已重置');
  }
}

// 預設實例
export const authOptimizer = AuthOptimizer.getInstance();

// 便利函數
export const checkAuth = (context?: string) => 
  authOptimizer.checkAuthenticationOptimized(context || 'default');

export const checkAuthSync = () => 
  authOptimizer.checkAuthenticationSync();

export const clearAuthCache = (context?: string) => 
  authOptimizer.clearAuthCheckCache(context);