/**
 * 快取測試工具
 * 用於測試和驗證快取機制運作
 */

import LocalStorageCacheService from '../services/LocalStorageCacheService';
import { CACHE_KEYS, CACHE_EXPIRY } from '../config/cacheConfig';

export class CacheTestUtils {
  private static cacheService = LocalStorageCacheService;

  /**
   * 測試基本快取功能
   */
  static async testBasicCache(): Promise<void> {
    console.group('🔬 測試基本快取功能');
    
    try {
      // 測試資料
      const testData = { 
        id: '1',
        name: '測試資料',
        timestamp: Date.now()
      };

      // 測試儲存
      const saveResult = await this.cacheService.set('test_key', testData);
      console.log('✅ 儲存測試:', saveResult ? '成功' : '失敗');

      // 測試讀取
      const retrievedData = await this.cacheService.get('test_key');
      console.log('✅ 讀取測試:', 
        JSON.stringify(retrievedData) === JSON.stringify(testData) ? '成功' : '失敗'
      );

      // 測試是否存在
      const hasData = await this.cacheService.has('test_key');
      console.log('✅ 存在測試:', hasData ? '成功' : '失敗');

      // 清理測試
      this.cacheService.remove('test_key');
      const afterRemove = await this.cacheService.has('test_key');
      console.log('✅ 移除測試:', !afterRemove ? '成功' : '失敗');

    } catch (error) {
      console.error('❌ 基本測試失敗:', error);
    }
    
    console.groupEnd();
  }

  /**
   * 測試資安防護功能
   */
  static async testSecurityFeatures(): Promise<void> {
    console.group('🛡️ 測試資安防護功能');
    
    try {
      // 測試敏感資料過濾
      const sensitiveData = {
        username: 'testuser',
        password: '123456',  // 應該被過濾
        token: 'secret-token', // 應該被過濾
        normalField: '正常資料'
      };

      await this.cacheService.set('sensitive_test', sensitiveData);
      const filtered = await this.cacheService.get('sensitive_test');
      
      const hasPassword = filtered && 'password' in filtered;
      const hasToken = filtered && 'token' in filtered;
      const hasNormal = filtered && 'normalField' in filtered;
      
      console.log('✅ 敏感欄位過濾:', !hasPassword && !hasToken && hasNormal ? '成功' : '失敗');

      // 測試 XSS 防護
      const xssData = '<script>alert("xss")</script>';
      const xssResult = await this.cacheService.set('xss_test', xssData);
      console.log('✅ XSS 防護:', !xssResult ? '成功 (阻止了惡意內容)' : '失敗');

      // 清理測試
      this.cacheService.remove('sensitive_test');
      this.cacheService.remove('xss_test');

    } catch (error) {
      console.error('❌ 安全測試失敗:', error);
    }
    
    console.groupEnd();
  }

  /**
   * 測試過期機制
   */
  static async testExpiryMechanism(): Promise<void> {
    console.group('⏰ 測試過期機制');
    
    try {
      const testData = { message: '短暫存在的資料' };
      
      // 設定 1 秒過期
      await this.cacheService.set('expiry_test', testData, 1000);
      
      // 立即檢查應該存在
      const immediately = await this.cacheService.has('expiry_test');
      console.log('✅ 立即檢查:', immediately ? '成功' : '失敗');
      
      // 等待 1.5 秒後檢查應該過期
      setTimeout(async () => {
        const afterExpiry = await this.cacheService.has('expiry_test');
        console.log('✅ 過期檢查:', !afterExpiry ? '成功' : '失敗');
      }, 1500);

    } catch (error) {
      console.error('❌ 過期測試失敗:', error);
    }
    
    console.groupEnd();
  }

  /**
   * 測試快取統計
   */
  static testCacheStats(): void {
    console.group('📊 測試快取統計');
    
    try {
      const stats = this.cacheService.getStats();
      console.log('快取統計資訊:', {
        項目數量: stats.itemCount,
        總大小: `${(stats.totalSize / 1024).toFixed(2)} KB`,
        命中率: `${stats.hitRate.toFixed(2)}%`,
        最後清理: new Date(stats.lastCleanup).toLocaleString()
      });
      
      console.log('✅ 統計功能: 正常運作');

    } catch (error) {
      console.error('❌ 統計測試失敗:', error);
    }
    
    console.groupEnd();
  }

  /**
   * 執行完整測試套件
   */
  static async runFullTestSuite(): Promise<void> {
    console.group('🚀 開始快取機制完整測試');
    
    await this.testBasicCache();
    await this.testSecurityFeatures();
    await this.testExpiryMechanism();
    this.testCacheStats();
    
    console.log('✨ 所有測試已完成！');
    console.groupEnd();
  }

  /**
   * 清除所有測試快取
   */
  static clearTestCache(): void {
    this.cacheService.clear();
    console.log('🧹 已清除所有測試快取');
  }

  /**
   * 模擬 Visual Editor API 使用場景
   */
  static async simulateVisualEditorUsage(): Promise<void> {
    console.group('🎭 模擬 Visual Editor 使用場景');
    
    try {
      // 模擬 Bot 列表
      const mockBots = [
        { id: '1', name: 'Bot 1', created_at: '2024-01-01' },
        { id: '2', name: 'Bot 2', created_at: '2024-01-02' }
      ];

      // 模擬邏輯模板列表
      const mockTemplates = [
        { id: 't1', name: '模板 1', created_at: '2024-01-01' },
        { id: 't2', name: '模板 2', created_at: '2024-01-02' }
      ];

      // 儲存模擬資料
      await this.cacheService.set(CACHE_KEYS.USER_BOTS_SUMMARY, mockBots, CACHE_EXPIRY.LIST_DATA);
      await this.cacheService.set(`${CACHE_KEYS.LOGIC_TEMPLATES_SUMMARY}_1`, mockTemplates, CACHE_EXPIRY.LIST_DATA);

      // 測試讀取
      const cachedBots = await this.cacheService.get(CACHE_KEYS.USER_BOTS_SUMMARY);
      const cachedTemplates = await this.cacheService.get(`${CACHE_KEYS.LOGIC_TEMPLATES_SUMMARY}_1`);

      console.log('✅ Bot 列表快取:', cachedBots ? '成功' : '失敗');
      console.log('✅ 模板列表快取:', cachedTemplates ? '成功' : '失敗');

      // 模擬失效操作（創建新項目後）
      this.cacheService.invalidateCache('CREATE', 'logic_template');
      
      const afterInvalidation = await this.cacheService.has(`${CACHE_KEYS.LOGIC_TEMPLATES_SUMMARY}_1`);
      console.log('✅ 快取失效:', !afterInvalidation ? '成功' : '失敗');

    } catch (error) {
      console.error('❌ 使用場景測試失敗:', error);
    }
    
    console.groupEnd();
  }
}

// 在開發環境下暴露到 window 物件供手動測試
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as unknown as {CacheTestUtils: typeof CacheTestUtils}).CacheTestUtils = CacheTestUtils;
  console.log('🛠️ CacheTestUtils 已載入，可在控制台使用');
  console.log('快速測試指令：');
  console.log('- CacheTestUtils.runFullTestSuite() // 執行完整測試');
  console.log('- CacheTestUtils.simulateVisualEditorUsage() // 模擬使用場景');
  console.log('- CacheTestUtils.clearTestCache() // 清除測試快取');
}