/**
 * 記憶體快取服務 - 用於快取用戶資料和 Bot 資料
 * 特性：TTL過期、自動清理、大小限制、類型安全
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface CacheConfig {
  defaultTTL: number;
  maxCacheSize: number;
  cleanupInterval: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheItem<any>> = new Map();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor(config?: Partial<CacheConfig>) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 預設 5 分鐘
      maxCacheSize: 100,         // 最大快取項目數量
      cleanupInterval: 60 * 1000, // 每分鐘清理過期項目
      ...config
    };

    this.startPeriodicCleanup();
  }

  public static getInstance(config?: Partial<CacheConfig>): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService(config);
    }
    return CacheService.instance;
  }

  /**
   * 設置快取項目
   */
  public set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      key
    };

    // 如果快取已滿，移除最舊的項目
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictOldestItem();
    }

    this.cache.set(key, item);
    console.debug(`快取已設定: ${key}, TTL: ${item.ttl}ms`);
  }

  /**
   * 獲取快取項目
   */
  public get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;
    
    if (!item) {
      return null;
    }

    // 檢查是否過期
    if (this.isExpired(item)) {
      this.cache.delete(key);
      console.debug(`快取已過期並移除: ${key}`);
      return null;
    }

    console.debug(`快取命中: ${key}`);
    return item.data;
  }

  /**
   * 檢查快取是否存在且未過期
   */
  public has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (this.isExpired(item)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * 刪除特定快取項目
   */
  public delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.debug(`快取已刪除: ${key}`);
    }
    return deleted;
  }

  /**
   * 清除所有快取
   */
  public clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.debug(`已清除所有快取，共 ${size} 個項目`);
  }

  /**
   * 清除匹配模式的快取項目
   */
  public clearPattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.debug(`已清除匹配模式 ${pattern} 的快取，共 ${keysToDelete.length} 個項目`);
  }

  /**
   * 獲取快取統計資訊
   */
  public getStats(): {
    size: number;
    maxSize: number;
    keys: string[];
    usage: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      keys: Array.from(this.cache.keys()),
      usage: Math.round((this.cache.size / this.config.maxCacheSize) * 100)
    };
  }

  /**
   * 檢查項目是否過期
   */
  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  /**
   * 移除最舊的項目
   */
  private evictOldestItem(): void {
    let oldestKey = '';
    let oldestTimestamp = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.debug(`已移除最舊快取項目: ${oldestKey}`);
    }
  }

  /**
   * 定期清理過期項目
   */
  private startPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredItems();
    }, this.config.cleanupInterval);
  }

  /**
   * 清理過期項目
   */
  private cleanupExpiredItems(): void {
    const keysToDelete: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.debug(`定期清理已移除 ${keysToDelete.length} 個過期快取項目`);
    }
  }

  /**
   * 停止清理計時器（用於測試或卸載）
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
    console.debug('快取服務已銷毀');
  }
}

// 預設快取服務實例
export const cacheService = CacheService.getInstance({
  defaultTTL: 5 * 60 * 1000,    // 5 分鐘
  maxCacheSize: 100,            // 最大 100 個項目
  cleanupInterval: 60 * 1000    // 每分鐘清理
});

// 快取鍵常量
export const CACHE_KEYS = {
  USER_DATA: 'auth:user_data',
  USER_PROFILE: 'auth:user_profile',
  BOTS_LIST: 'bots:list',
  BOT_DETAIL: (id: string) => `bots:detail:${id}`,
  AUTH_STATUS: 'auth:status'
} as const;

// 快取 TTL 常量
export const CACHE_TTL = {
  USER_DATA: 5 * 60 * 1000,     // 用戶基本資料 5 分鐘
  USER_PROFILE: 10 * 60 * 1000, // 用戶完整檔案 10 分鐘
  BOTS_LIST: 5 * 60 * 1000,     // Bot 清單 5 分鐘
  BOT_DETAIL: 10 * 60 * 1000,   // Bot 詳情 10 分鐘
  AUTH_STATUS: 30 * 1000        // 認證狀態 30 秒
} as const;