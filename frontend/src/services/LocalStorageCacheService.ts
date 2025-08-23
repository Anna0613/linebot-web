/**
 * LocalStorage 安全快取服務
 * 提供具備完整性驗證、過期控制和XSS防護的本地儲存快取功能
 */

import { 
  CACHE_KEYS, 
  CACHE_EXPIRY, 
  CACHE_SECURITY, 
  CACHE_STRATEGIES,
  SENSITIVE_FIELDS,
  CACHE_INVALIDATION_TRIGGERS
} from '../config/cacheConfig';

// 快取項目介面
interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  expiry: number;
  signature: string;
}

// 快取統計介面
interface CacheStats {
  totalSize: number;
  itemCount: number;
  hitRate: number;
  lastCleanup: number;
}

export class LocalStorageCacheService {
  private static instance: LocalStorageCacheService;
  private readonly prefix = 'visual_editor_cache_';
  private stats: CacheStats = {
    totalSize: 0,
    itemCount: 0,
    hitRate: 0,
    lastCleanup: 0
  };
  private hitCount = 0;
  private missCount = 0;

  private constructor() {
    this.initializeCleanup();
  }

  /**
   * 獲取快取服務單例
   */
  static getInstance(): LocalStorageCacheService {
    if (!LocalStorageCacheService.instance) {
      LocalStorageCacheService.instance = new LocalStorageCacheService();
    }
    return LocalStorageCacheService.instance;
  }

  /**
   * 生成 HMAC-SHA256 簽名
   */
  private async generateSignature(data: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(CACHE_SECURITY.HMAC_SECRET);
      const messageData = encoder.encode(data);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
      return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error('簽名生成失敗:', error);
      // 降級到基本檢查和
      return this.simpleChecksum(data);
    }
  }

  /**
   * 簡單檢查和（降級方案）
   */
  private simpleChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 轉為32位整數
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * 驗證數據簽名
   */
  private async verifySignature(data: string, signature: string): Promise<boolean> {
    try {
      const expectedSignature = await this.generateSignature(data);
      return expectedSignature === signature;
    } catch (error) {
      console.error('簽名驗證失敗:', error);
      return false;
    }
  }

  /**
   * 清理敏感欄位
   */
  private sanitizeData<T>(data: T): T {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = JSON.parse(JSON.stringify(data));
    
    const cleanObject = (obj: any) => {
      if (Array.isArray(obj)) {
        return obj.map(item => cleanObject(item));
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          // 檢查是否為敏感欄位
          const isSensitive = SENSITIVE_FIELDS.some(field => 
            key.toLowerCase().includes(field.toLowerCase())
          );
          
          if (!isSensitive) {
            cleaned[key] = cleanObject(value);
          }
        }
        return cleaned;
      }
      
      return obj;
    };

    return cleanObject(sanitized);
  }

  /**
   * 驗證數據類型和結構
   */
  private validateData(data: any): boolean {
    try {
      // 檢查數據類型
      const dataType = typeof data;
      if (!CACHE_SECURITY.ALLOWED_TYPES.includes(dataType)) {
        return false;
      }

      // 檢查數據大小
      const dataString = JSON.stringify(data);
      if (dataString.length > CACHE_SECURITY.MAX_ITEM_SIZE) {
        console.warn('快取項目超出大小限制');
        return false;
      }

      // 基本XSS檢查
      if (typeof data === 'string') {
        const scriptPattern = /<script[^>]*>.*?<\/script>/gi;
        const eventPattern = /on\w+\s*=/gi;
        if (scriptPattern.test(data) || eventPattern.test(data)) {
          console.warn('檢測到潛在的XSS內容');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('數據驗證失敗:', error);
      return false;
    }
  }

  /**
   * 儲存數據到快取
   */
  async set<T>(key: keyof typeof CACHE_KEYS | string, data: T, customExpiry?: number): Promise<boolean> {
    try {
      // 清理敏感數據
      const sanitizedData = this.sanitizeData(data);
      
      // 驗證數據
      if (!this.validateData(sanitizedData)) {
        return false;
      }

      const now = Date.now();
      const expiry = customExpiry || CACHE_EXPIRY.DEFAULT;
      const dataString = JSON.stringify(sanitizedData);
      const signature = await this.generateSignature(dataString);

      const cacheItem: CacheItem<T> = {
        data: sanitizedData,
        timestamp: now,
        expiry: now + expiry,
        signature
      };

      const cacheKey = this.prefix + key;
      const itemString = JSON.stringify(cacheItem);
      
      // 檢查總快取大小
      if (this.stats.totalSize + itemString.length > CACHE_SECURITY.MAX_CACHE_SIZE) {
        this.cleanup(true); // 強制清理
      }

      localStorage.setItem(cacheKey, itemString);
      this.updateStats();
      
      return true;
    } catch (error) {
      console.error('快取儲存失敗:', error);
      return false;
    }
  }

  /**
   * 從快取獲取數據
   */
  async get<T>(key: keyof typeof CACHE_KEYS | string): Promise<T | null> {
    try {
      const cacheKey = this.prefix + key;
      const itemString = localStorage.getItem(cacheKey);
      
      if (!itemString) {
        this.missCount++;
        this.updateHitRate();
        return null;
      }

      const cacheItem: CacheItem<T> = JSON.parse(itemString);
      const now = Date.now();

      // 檢查是否過期
      if (now > cacheItem.expiry) {
        localStorage.removeItem(cacheKey);
        this.missCount++;
        this.updateHitRate();
        return null;
      }

      // 驗證數據完整性
      const dataString = JSON.stringify(cacheItem.data);
      const isValid = await this.verifySignature(dataString, cacheItem.signature);
      
      if (!isValid) {
        console.warn('快取數據完整性驗證失敗');
        localStorage.removeItem(cacheKey);
        this.missCount++;
        this.updateHitRate();
        return null;
      }

      // 再次驗證數據結構
      if (!this.validateData(cacheItem.data)) {
        localStorage.removeItem(cacheKey);
        this.missCount++;
        this.updateHitRate();
        return null;
      }

      this.hitCount++;
      this.updateHitRate();
      return cacheItem.data;
    } catch (error) {
      console.error('快取讀取失敗:', error);
      this.missCount++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * 檢查快取是否存在且有效
   */
  async has(key: keyof typeof CACHE_KEYS | string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * 移除特定快取項目
   */
  remove(key: keyof typeof CACHE_KEYS | string): boolean {
    try {
      const cacheKey = this.prefix + key;
      localStorage.removeItem(cacheKey);
      this.updateStats();
      return true;
    } catch (error) {
      console.error('快取移除失敗:', error);
      return false;
    }
  }

  /**
   * 清除所有快取
   */
  clear(): boolean {
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      }
      
      this.stats = {
        totalSize: 0,
        itemCount: 0,
        hitRate: 0,
        lastCleanup: Date.now()
      };
      this.hitCount = 0;
      this.missCount = 0;
      
      return true;
    } catch (error) {
      console.error('快取清除失敗:', error);
      return false;
    }
  }

  /**
   * 根據觸發器清除相關快取
   */
  invalidateCache(operation: keyof typeof CACHE_INVALIDATION_TRIGGERS, entityType: string): void {
    const triggers = CACHE_INVALIDATION_TRIGGERS[operation];
    if (triggers && triggers[entityType as keyof typeof triggers]) {
      const keysToRemove = triggers[entityType as keyof typeof triggers];
      keysToRemove.forEach(key => {
        this.remove(key);
      });
    }
  }

  /**
   * 清理過期的快取項目
   */
  cleanup(force = false): void {
    try {
      const now = Date.now();
      const keys = Object.keys(localStorage);
      let cleanedCount = 0;

      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          try {
            const itemString = localStorage.getItem(key);
            if (itemString) {
              const cacheItem: CacheItem = JSON.parse(itemString);
              if (force || now > cacheItem.expiry) {
                localStorage.removeItem(key);
                cleanedCount++;
              }
            }
          } catch (error) {
            // 如果解析失敗，移除該項目
            localStorage.removeItem(key);
            cleanedCount++;
          }
        }
      }

      this.stats.lastCleanup = now;
      this.updateStats();
      
      if (cleanedCount > 0) {
        console.log(`已清理 ${cleanedCount} 個過期快取項目`);
      }
    } catch (error) {
      console.error('快取清理失敗:', error);
    }
  }

  /**
   * 獲取快取統計
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 更新快取統計
   */
  private updateStats(): void {
    try {
      const keys = Object.keys(localStorage);
      let totalSize = 0;
      let itemCount = 0;

      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          const item = localStorage.getItem(key);
          if (item) {
            totalSize += item.length;
            itemCount++;
          }
        }
      }

      this.stats.totalSize = totalSize;
      this.stats.itemCount = itemCount;
    } catch (error) {
      console.error('統計更新失敗:', error);
    }
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.hitCount + this.missCount;
    this.stats.hitRate = total > 0 ? (this.hitCount / total) * 100 : 0;
  }

  /**
   * 初始化自動清理
   */
  private initializeCleanup(): void {
    // 每5分鐘自動清理一次過期項目
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    // 頁面卸載時清理
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }
}

// 導出單例實例
export default LocalStorageCacheService.getInstance();