/**
 * 效能測試腳本 - 驗證快取優化效果
 */

import { performanceMonitor } from './performanceMonitor';
import { cacheService } from '../services/CacheService';
import { botCacheService } from '../services/BotCacheService';

export class PerformanceTest {
  private static instance: PerformanceTest;

  private constructor() {}

  public static getInstance(): PerformanceTest {
    if (!PerformanceTest.instance) {
      PerformanceTest.instance = new PerformanceTest();
    }
    return PerformanceTest.instance;
  }

  /**
   * 執行完整的效能測試套件
   */
  public async runFullTestSuite(): Promise<void> {
    console.group('🧪 執行完整效能測試套件');
    
    try {
      // 清除現有指標
      performanceMonitor.clearEvents();
      
      console.log('正在執行測試...');
      
      // 執行各項測試
      await this.testCachePerformance();
      await this.testAuthenticationPerformance();
      await this.testDataFetchPerformance();
      
      // 生成報告
      this.generateTestReport();
      
    } catch (error) {
      console.error('效能測試執行失敗:', error);
    }
    
    console.groupEnd();
  }

  /**
   * 測試快取效能
   */
  private async testCachePerformance(): Promise<void> {
    console.log('測試快取效能...');
    
    // 模擬資料
    const testData = {
      id: 'test-bot-1',
      name: 'Test Bot',
      description: 'Test Description',
      created_at: new Date().toISOString()
    };

    // 測試設定快取（第一次，會比較慢）
    performanceMonitor.measureCacheOperation(
      'setCache-first',
      () => cacheService.set('test_bot_1', testData, 60000),
      false
    );

    // 測試從快取獲取（應該很快）
    for (let i = 0; i < 5; i++) {
      performanceMonitor.measureCacheOperation(
        'getCache',
        () => cacheService.get('test_bot_1'),
        true
      );
    }

    // 模擬 API 呼叫（較慢）
    for (let i = 0; i < 3; i++) {
      await performanceMonitor.measureDataFetch(
        'simulateAPI',
        () => this.simulateApiCall(100 + Math.random() * 200), // 100-300ms 延遲
        false
      );
    }
  }

  /**
   * 測試認證效能
   */
  private async testAuthenticationPerformance(): Promise<void> {
    console.log('測試認證效能...');
    
    // 模擬認證檢查
    for (let i = 0; i < 3; i++) {
      await performanceMonitor.measureAuthCheck(
        () => this.simulateAuthCheck(),
        i > 0 // 第一次不是快取，後續是快取
      );
    }
  }

  /**
   * 測試資料獲取效能
   */
  private async testDataFetchPerformance(): Promise<void> {
    console.log('測試資料獲取效能...');
    
    // 模擬首次 API 請求（慢）
    await performanceMonitor.measureDataFetch(
      'fetchUserData',
      () => this.simulateApiCall(300),
      false
    );

    // 模擬快取命中（快）
    performanceMonitor.measureCacheOperation(
      'getCachedUserData',
      () => ({ id: 'user1', name: 'Test User' }),
      true
    );

    // 模擬 Bot 資料獲取
    await performanceMonitor.measureDataFetch(
      'fetchBotsList',
      () => this.simulateApiCall(250),
      false
    );

    // 模擬快取 Bot 資料
    for (let i = 0; i < 5; i++) {
      performanceMonitor.measureCacheOperation(
        'getCachedBots',
        () => botCacheService.getBotsList(),
        true
      );
    }
  }

  /**
   * 模擬 API 呼叫延遲
   */
  private simulateApiCall(delayMs: number): Promise<any> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ success: true, data: 'mock data', timestamp: Date.now() });
      }, delayMs);
    });
  }

  /**
   * 模擬認證檢查
   */
  private simulateAuthCheck(): Promise<{ isAuthenticated: boolean; fromCache: boolean }> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          isAuthenticated: true,
          fromCache: Math.random() > 0.3 // 70% 機率從快取
        });
      }, Math.random() * 50); // 0-50ms 延遲
    });
  }

  /**
   * 生成測試報告
   */
  private generateTestReport(): void {
    console.group('📊 效能測試報告');
    
    // 生成快取效能報告
    const cacheReport = performanceMonitor.getCachePerformanceReport();
    
    console.log('=== 快取效能摘要 ===');
    console.log(`總操作數: ${cacheReport.totalCacheOperations}`);
    console.log(`快取命中率: ${cacheReport.cacheHitRate.toFixed(1)}%`);
    console.log(`平均快取時間: ${cacheReport.averageCacheTime.toFixed(2)}ms`);
    console.log(`平均 API 時間: ${cacheReport.averageApiTime.toFixed(2)}ms`);
    
    if (cacheReport.speedImprovement > 1) {
      console.log(`🚀 效能提升: ${cacheReport.speedImprovement.toFixed(1)}x 倍`);
      
      const timeReduction = ((cacheReport.averageApiTime - cacheReport.averageCacheTime) / cacheReport.averageApiTime * 100);
      console.log(`⏱️ 時間節省: ${timeReduction.toFixed(1)}%`);
    }

    console.log('\n=== 各操作詳細分析 ===');
    Object.entries(cacheReport.operations).forEach(([operation, stats]) => {
      const hitRate = ((stats.cacheHits / stats.totalCount) * 100).toFixed(1);
      console.log(`${operation}:`);
      console.log(`  總次數: ${stats.totalCount}, 快取命中: ${hitRate}%`);
      console.log(`  平均時間: ${stats.averageTime.toFixed(2)}ms`);
      
      if (stats.cacheAverage > 0 && stats.apiAverage > 0) {
        const improvement = (stats.apiAverage / stats.cacheAverage).toFixed(1);
        console.log(`  快取: ${stats.cacheAverage.toFixed(2)}ms, API: ${stats.apiAverage.toFixed(2)}ms (${improvement}x 提升)`);
      }
    });

    console.log('\n=== 優化建議 ===');
    this.generateOptimizationRecommendations(cacheReport);

    console.groupEnd();
  }

  /**
   * 生成優化建議
   */
  private generateOptimizationRecommendations(report: any): void {
    const recommendations: string[] = [];

    if (report.cacheHitRate < 50) {
      recommendations.push('快取命中率偏低，考慮增加快取時間 (TTL) 或改善快取策略');
    }

    if (report.cacheHitRate > 80) {
      recommendations.push('快取命中率良好，繼續維持當前策略');
    }

    if (report.speedImprovement > 5) {
      recommendations.push('快取效能優異，考慮擴展快取範圍到更多操作');
    }

    if (report.averageApiTime > 500) {
      recommendations.push('API 回應時間較慢，考慮實作更積極的快取策略或背景更新');
    }

    if (report.totalCacheOperations < 10) {
      recommendations.push('測試操作數量較少，建議在實際使用中收集更多資料');
    }

    if (recommendations.length === 0) {
      recommendations.push('快取配置良好，效能表現符合預期');
    }

    recommendations.forEach((recommendation, index) => {
      console.log(`${index + 1}. ${recommendation}`);
    });
  }

  /**
   * 快速效能檢查
   */
  public async quickPerformanceCheck(): Promise<{
    cacheStatus: 'good' | 'warning' | 'poor';
    hitRate: number;
    averageImprovement: number;
    recommendation: string;
  }> {
    const report = performanceMonitor.getCachePerformanceReport();
    
    let cacheStatus: 'good' | 'warning' | 'poor' = 'poor';
    let recommendation = '';

    if (report.cacheHitRate > 70 && report.speedImprovement > 3) {
      cacheStatus = 'good';
      recommendation = '快取效能優秀，繼續保持';
    } else if (report.cacheHitRate > 50 && report.speedImprovement > 2) {
      cacheStatus = 'warning';
      recommendation = '快取效能尚可，可考慮進一步優化';
    } else {
      cacheStatus = 'poor';
      recommendation = '快取效能需要改善，檢查快取策略和 TTL 設定';
    }

    return {
      cacheStatus,
      hitRate: report.cacheHitRate,
      averageImprovement: report.speedImprovement,
      recommendation
    };
  }

  /**
   * 重置測試環境
   */
  public resetTestEnvironment(): void {
    performanceMonitor.clearEvents();
    cacheService.clear();
    botCacheService.clearAllBotCache();
    console.log('測試環境已重置');
  }
}

// 預設實例
export const performanceTest = PerformanceTest.getInstance();

// 便利函數
export const runPerformanceTest = () => performanceTest.runFullTestSuite();
export const quickCheck = () => performanceTest.quickPerformanceCheck();
export const resetTest = () => performanceTest.resetTestEnvironment();