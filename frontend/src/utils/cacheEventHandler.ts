/**
 * 全域快取事件處理器 - 監聽認證狀態變化並清理相關快取
 */

import { cacheService } from '../services/CacheService';
import { botCacheService } from '../services/BotCacheService';

export interface CacheEvent extends CustomEvent {
  detail: {
    eventType: 'auth_expired' | 'auth_refresh_failed' | 'user_logout';
    message?: string;
    clearAll?: boolean;
  };
}

export class CacheEventHandler {
  private static instance: CacheEventHandler;
  private isListening = false;

  private constructor() {}

  public static getInstance(): CacheEventHandler {
    if (!CacheEventHandler.instance) {
      CacheEventHandler.instance = new CacheEventHandler();
    }
    return CacheEventHandler.instance;
  }

  /**
   * 開始監聽認證相關事件
   */
  public startListening(): void {
    if (this.isListening) return;

    // 監聽認證過期事件
    window.addEventListener('auth_expired', this.handleAuthExpired);
    
    // 監聽 refresh token 失效事件
    window.addEventListener('auth_refresh_failed', this.handleRefreshFailed);
    
    // 監聽用戶登出事件
    window.addEventListener('user_logout', this.handleUserLogout);

    // 監聽頁面即將卸載事件（可選的快取清理）
    window.addEventListener('beforeunload', this.handleBeforeUnload);

    this.isListening = true;
    console.debug('快取事件監聽器已啟動');
  }

  /**
   * 停止監聽事件
   */
  public stopListening(): void {
    if (!this.isListening) return;

    window.removeEventListener('auth_expired', this.handleAuthExpired);
    window.removeEventListener('auth_refresh_failed', this.handleRefreshFailed);
    window.removeEventListener('user_logout', this.handleUserLogout);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);

    this.isListening = false;
    console.debug('快取事件監聽器已停止');
  }

  /**
   * 處理認證過期事件
   */
  private handleAuthExpired = (event: Event) => {
    const authEvent = event as CacheEvent;
    console.debug('收到認證過期事件:', authEvent.detail);
    
    this.clearAuthRelatedCache();
    
    // 觸發自定義事件通知其他組件
    this.dispatchCacheEvent('cache_cleared', {
      reason: 'auth_expired',
      message: authEvent.detail.message
    });
  };

  /**
   * 處理 refresh token 失效事件
   */
  private handleRefreshFailed = (event: Event) => {
    const refreshEvent = event as CacheEvent;
    console.debug('收到 refresh token 失效事件:', refreshEvent.detail);
    
    this.clearAllCache();
    
    // 觸發自定義事件通知其他組件
    this.dispatchCacheEvent('cache_cleared', {
      reason: 'refresh_failed',
      message: refreshEvent.detail.message
    });
  };

  /**
   * 處理用戶登出事件
   */
  private handleUserLogout = (event: Event) => {
    const logoutEvent = event as CacheEvent;
    console.debug('收到用戶登出事件:', logoutEvent.detail);
    
    this.clearAllCache();
    
    // 觸發自定義事件通知其他組件
    this.dispatchCacheEvent('cache_cleared', {
      reason: 'user_logout',
      message: '用戶主動登出'
    });
  };

  /**
   * 處理頁面即將卸載事件
   */
  private handleBeforeUnload = () => {
    // 可選：在頁面卸載前清理敏感快取
    // 這裡可以根據需要決定是否清理
    console.debug('頁面即將卸載，快取保持不變');
  };

  /**
   * 清除認證相關快取
   */
  private clearAuthRelatedCache(): void {
    try {
      // 清除認證快取
      cacheService.clearPattern('^auth:');
      
      // 清除 Bot 快取（因為可能包含用戶特定資料）
      botCacheService.clearAllBotCache();
      
      console.debug('已清除認證相關快取');
    } catch (error) {
      console.error('清除認證相關快取失敗:', error);
    }
  }

  /**
   * 清除所有快取
   */
  private clearAllCache(): void {
    try {
      // 清除所有快取
      cacheService.clear();
      botCacheService.clearAllBotCache();
      
      console.debug('已清除所有快取');
    } catch (error) {
      console.error('清除所有快取失敗:', error);
    }
  }

  /**
   * 派發快取事件
   */
  private dispatchCacheEvent(eventType: string, detail: Record<string, any>): void {
    try {
      const event = new CustomEvent(eventType, { detail });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('派發快取事件失敗:', error);
    }
  }

  /**
   * 手動觸發快取清理
   */
  public clearCacheManually(reason: 'auth_expired' | 'refresh_failed' | 'user_logout' = 'user_logout'): void {
    switch (reason) {
      case 'auth_expired':
        this.clearAuthRelatedCache();
        break;
      case 'refresh_failed':
      case 'user_logout':
        this.clearAllCache();
        break;
    }
    
    this.dispatchCacheEvent('cache_cleared', { reason });
  }

  /**
   * 獲取監聽狀態
   */
  public isEventListening(): boolean {
    return this.isListening;
  }
}

// 預設實例
export const cacheEventHandler = CacheEventHandler.getInstance();

// 自動啟動監聽（在應用程式啟動時）
export const initializeCacheEventHandler = () => {
  cacheEventHandler.startListening();
  console.debug('快取事件處理器已初始化');
};

// 清理函數（在應用程式關閉時）
export const destroyCacheEventHandler = () => {
  cacheEventHandler.stopListening();
  console.debug('快取事件處理器已清理');
};