/**
 * 性能監控工具
 * 提供性能指標收集、分析和優化建議
 */

// 擴展 Performance 接口以支持 memory 屬性
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

// 性能指標界面
interface PerformanceMetrics {
  componentRenderTime: number;
  memoryUsage: number;
  bundleSize: number;
  apiResponseTime: number;
  userInteractionDelay: number;
  blockOperationTime: number;
}

// 性能事件類型
type PerformanceEventType = 
  | 'component-render'
  | 'api-request'
  | 'user-interaction'
  | 'block-operation'
  | 'memory-usage'
  | 'page-load'
  | 'cache-operation'
  | 'auth-check'
  | 'data-fetch';

// 性能事件詳情
interface PerformanceEvent {
  type: PerformanceEventType;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, unknown>;
}

// 性能分析結果
interface PerformanceAnalysis {
  averageRenderTime: number;
  memoryTrend: 'increasing' | 'stable' | 'decreasing';
  performanceScore: number; // 0-100
  recommendations: string[];
  bottlenecks: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    solution: string;
  }>;
}

class PerformanceMonitor {
  private events: PerformanceEvent[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private memoryCheckInterval?: NodeJS.Timeout;
  private isEnabled: boolean = true;

  constructor() {
    this.initializeObservers();
    this.startMemoryMonitoring();
  }

  /**
   * 初始化性能觀察器
   */
  private initializeObservers(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      console.warn('Performance API not available');
      return;
    }

    try {
      // 觀察長任務
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // 超過 50ms 的任務
            this.recordEvent({
              type: 'component-render',
              name: 'long-task',
              startTime: entry.startTime,
              endTime: entry.startTime + entry.duration,
              duration: entry.duration,
              metadata: { entryType: entry.entryType }
            });
          }
        }
      });

      if ('longtask' in window.PerformanceObserver.supportedEntryTypes) {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      }

      // 觀察導航性能
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordEvent({
            type: 'page-load',
            name: 'navigation',
            startTime: entry.startTime,
            endTime: entry.startTime + entry.duration,
            duration: entry.duration,
            metadata: { 
              entryType: entry.entryType,
              transferSize: (entry as PerformanceNavigationTiming).transferSize
            }
          });
        }
      });

      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navigationObserver);

    } catch (error) {
      console.warn('Failed to initialize performance observers:', error);
    }
  }

  /**
   * 開始記憶體監控
   */
  private startMemoryMonitoring(): void {
    if (typeof window === 'undefined' || !(window.performance as PerformanceWithMemory).memory) {
      return;
    }

    this.memoryCheckInterval = setInterval(() => {
      const memory = (window.performance as PerformanceWithMemory).memory;
      this.recordEvent({
        type: 'memory-usage',
        name: 'heap-check',
        startTime: performance.now(),
        endTime: performance.now(),
        duration: 0,
        metadata: {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        }
      });
    }, 10000); // 每 10 秒檢查一次記憶體
  }

  /**
   * 記錄性能事件
   */
  recordEvent(event: PerformanceEvent): void {
    if (!this.isEnabled) return;
    
    this.events.push(event);
    
    // 保持最近 1000 個事件
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  /**
   * 開始測量組件渲染時間
   */
  startComponentRender(componentName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      this.recordEvent({
        type: 'component-render',
        name: componentName,
        startTime,
        endTime,
        duration: endTime - startTime
      });
    };
  }

  /**
   * 測量 API 請求時間
   */
  measureApiRequest<T>(requestName: string, apiCall: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    return apiCall().finally(() => {
      const endTime = performance.now();
      this.recordEvent({
        type: 'api-request',
        name: requestName,
        startTime,
        endTime,
        duration: endTime - startTime
      });
    });
  }

  /**
   * 測量用戶交互延遲
   */
  measureUserInteraction(interactionName: string, action: () => void): void {
    const startTime = performance.now();
    
    // 使用 requestAnimationFrame 確保測量到實際的視覺更新
    requestAnimationFrame(() => {
      action();
      
      requestAnimationFrame(() => {
        const endTime = performance.now();
        this.recordEvent({
          type: 'user-interaction',
          name: interactionName,
          startTime,
          endTime,
          duration: endTime - startTime
        });
      });
    });
  }

  /**
   * 測量積木操作時間
   */
  measureBlockOperation(operationName: string, operation: () => void): void {
    const startTime = performance.now();
    operation();
    const endTime = performance.now();
    
    this.recordEvent({
      type: 'block-operation',
      name: operationName,
      startTime,
      endTime,
      duration: endTime - startTime
    });
  }

  /**
   * 測量快取操作時間
   */
  measureCacheOperation<T>(operationName: string, operation: () => T, fromCache: boolean = false): T {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    
    this.recordEvent({
      type: 'cache-operation',
      name: operationName,
      startTime,
      endTime,
      duration: endTime - startTime,
      metadata: { fromCache, source: fromCache ? 'cache' : 'api' }
    });
    
    return result;
  }

  /**
   * 測量認證檢查時間
   */
  measureAuthCheck<T>(operation: () => Promise<T>, fromCache: boolean = false): Promise<T> {
    const startTime = performance.now();
    
    return operation().finally(() => {
      const endTime = performance.now();
      this.recordEvent({
        type: 'auth-check',
        name: 'auth-validation',
        startTime,
        endTime,
        duration: endTime - startTime,
        metadata: { fromCache }
      });
    });
  }

  /**
   * 測量資料獲取時間
   */
  measureDataFetch<T>(fetchName: string, fetchOperation: () => Promise<T>, fromCache: boolean = false): Promise<T> {
    const startTime = performance.now();
    
    return fetchOperation().finally(() => {
      const endTime = performance.now();
      this.recordEvent({
        type: 'data-fetch',
        name: fetchName,
        startTime,
        endTime,
        duration: endTime - startTime,
        metadata: { fromCache }
      });
    });
  }

  /**
   * 獲取性能分析結果
   */
  getPerformanceAnalysis(): PerformanceAnalysis {
    const renderEvents = this.events.filter(e => e.type === 'component-render');
    const memoryEvents = this.events.filter(e => e.type === 'memory-usage');
    const interactionEvents = this.events.filter(e => e.type === 'user-interaction');
    
    // 計算平均渲染時間
    const averageRenderTime = renderEvents.length > 0 
      ? renderEvents.reduce((sum, e) => sum + e.duration, 0) / renderEvents.length
      : 0;

    // 分析記憶體趨勢
    const memoryTrend = this.analyzeMemoryTrend(memoryEvents);
    
    // 計算性能分數
    const performanceScore = this.calculatePerformanceScore(renderEvents, interactionEvents);
    
    // 生成建議和瓶頸分析
    const recommendations = this.generateRecommendations(renderEvents, interactionEvents);
    const bottlenecks = this.identifyBottlenecks(renderEvents, interactionEvents);

    return {
      averageRenderTime,
      memoryTrend,
      performanceScore,
      recommendations,
      bottlenecks
    };
  }

  /**
   * 分析記憶體趨勢
   */
  private analyzeMemoryTrend(memoryEvents: PerformanceEvent[]): 'increasing' | 'stable' | 'decreasing' {
    if (memoryEvents.length < 3) return 'stable';
    
    const recentEvents = memoryEvents.slice(-10);
    const firstUsage = recentEvents[0]?.metadata?.usedJSHeapSize || 0;
    const lastUsage = recentEvents[recentEvents.length - 1]?.metadata?.usedJSHeapSize || 0;
    
    const diff = lastUsage - firstUsage;
    const threshold = firstUsage * 0.1; // 10% 閾值
    
    if (diff > threshold) return 'increasing';
    if (diff < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * 計算性能分數
   */
  private calculatePerformanceScore(renderEvents: PerformanceEvent[], interactionEvents: PerformanceEvent[]): number {
    let score = 100;
    
    // 渲染時間懲罰
    const avgRenderTime = renderEvents.length > 0 
      ? renderEvents.reduce((sum, e) => sum + e.duration, 0) / renderEvents.length
      : 0;
    
    if (avgRenderTime > 16) score -= Math.min(30, (avgRenderTime - 16) * 2);
    
    // 交互延遲懲罰
    const avgInteractionDelay = interactionEvents.length > 0
      ? interactionEvents.reduce((sum, e) => sum + e.duration, 0) / interactionEvents.length
      : 0;
    
    if (avgInteractionDelay > 100) score -= Math.min(40, (avgInteractionDelay - 100) * 0.5);
    
    // 長任務懲罰
    const longTasks = this.events.filter(e => e.duration > 50);
    score -= Math.min(20, longTasks.length * 5);
    
    return Math.max(0, Math.round(score));
  }

  /**
   * 生成優化建議
   */
  private generateRecommendations(renderEvents: PerformanceEvent[], interactionEvents: PerformanceEvent[]): string[] {
    const recommendations: string[] = [];
    
    const avgRenderTime = renderEvents.length > 0 
      ? renderEvents.reduce((sum, e) => sum + e.duration, 0) / renderEvents.length
      : 0;
    
    if (avgRenderTime > 16) {
      recommendations.push('考慮使用 React.memo 或 useMemo 來減少不必要的重新渲染');
      recommendations.push('檢查是否有複雜的計算可以移到 Web Worker 中');
    }
    
    const longRenders = renderEvents.filter(e => e.duration > 50);
    if (longRenders.length > 0) {
      recommendations.push('發現渲染時間過長的組件，建議進行組件分割或虛擬化');
    }
    
    const slowInteractions = interactionEvents.filter(e => e.duration > 100);
    if (slowInteractions.length > 0) {
      recommendations.push('用戶交互響應時間較慢，建議使用防抖或節流優化');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('性能表現良好，繼續保持當前的優化策略');
    }
    
    return recommendations;
  }

  /**
   * 識別性能瓶頸
   */
  private identifyBottlenecks(renderEvents: PerformanceEvent[], interactionEvents: PerformanceEvent[]): Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    solution: string;
  }> {
    const bottlenecks: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      solution: string;
    }> = [];
    
    // 檢查渲染瓶頸
    const slowRenders = renderEvents.filter(e => e.duration > 100);
    if (slowRenders.length > 0) {
      bottlenecks.push({
        type: 'render-performance',
        severity: slowRenders.length > 5 ? 'high' : 'medium',
        description: `發現 ${slowRenders.length} 個渲染時間超過 100ms 的組件`,
        solution: '使用 React DevTools Profiler 分析具體組件，考慮使用虛擬化或代碼分割'
      });
    }
    
    // 檢查交互瓶頸
    const slowInteractions = interactionEvents.filter(e => e.duration > 200);
    if (slowInteractions.length > 0) {
      bottlenecks.push({
        type: 'interaction-lag',
        severity: 'high',
        description: `用戶交互延遲超過 200ms，影響用戶體驗`,
        solution: '實施防抖機制，將計算密集型操作移到 Web Worker'
      });
    }
    
    return bottlenecks;
  }

  /**
   * 獲取實時性能指標
   */
  getRealTimeMetrics(): PerformanceMetrics {
    const recentEvents = this.events.slice(-50);
    const renderEvents = recentEvents.filter(e => e.type === 'component-render');
    const apiEvents = recentEvents.filter(e => e.type === 'api-request');
    const interactionEvents = recentEvents.filter(e => e.type === 'user-interaction');
    const blockEvents = recentEvents.filter(e => e.type === 'block-operation');
    
    const memoryUsage = typeof window !== 'undefined' && (window.performance as PerformanceWithMemory).memory
      ? (window.performance as PerformanceWithMemory).memory.usedJSHeapSize / 1024 / 1024 // MB
      : 0;

    return {
      componentRenderTime: renderEvents.length > 0 
        ? renderEvents.reduce((sum, e) => sum + e.duration, 0) / renderEvents.length
        : 0,
      memoryUsage,
      bundleSize: 0, // 需要從 build 信息獲取
      apiResponseTime: apiEvents.length > 0
        ? apiEvents.reduce((sum, e) => sum + e.duration, 0) / apiEvents.length
        : 0,
      userInteractionDelay: interactionEvents.length > 0
        ? interactionEvents.reduce((sum, e) => sum + e.duration, 0) / interactionEvents.length
        : 0,
      blockOperationTime: blockEvents.length > 0
        ? blockEvents.reduce((sum, e) => sum + e.duration, 0) / blockEvents.length
        : 0
    };
  }

  /**
   * 啟用/禁用監控
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * 清除事件記錄
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * 生成快取效能報告
   */
  getCachePerformanceReport(): {
    cacheHitRate: number;
    averageCacheTime: number;
    averageApiTime: number;
    totalCacheOperations: number;
    speedImprovement: number;
    operations: Record<string, {
      totalCount: number;
      cacheHits: number;
      averageTime: number;
      cacheAverage: number;
      apiAverage: number;
    }>;
  } {
    const cacheEvents = this.events.filter(e => 
      e.type === 'cache-operation' || 
      e.type === 'data-fetch' || 
      e.type === 'auth-check'
    );

    if (cacheEvents.length === 0) {
      return {
        cacheHitRate: 0,
        averageCacheTime: 0,
        averageApiTime: 0,
        totalCacheOperations: 0,
        speedImprovement: 0,
        operations: {}
      };
    }

    const cacheHits = cacheEvents.filter(e => e.metadata?.fromCache === true);
    const apiCalls = cacheEvents.filter(e => e.metadata?.fromCache === false);
    
    const cacheTotalTime = cacheHits.reduce((sum, e) => sum + e.duration, 0);
    const apiTotalTime = apiCalls.reduce((sum, e) => sum + e.duration, 0);
    
    const averageCacheTime = cacheHits.length > 0 ? cacheTotalTime / cacheHits.length : 0;
    const averageApiTime = apiCalls.length > 0 ? apiTotalTime / apiCalls.length : 0;
    
    // 按操作名稱分組統計
    const operationGroups = cacheEvents.reduce((groups, event) => {
      const key = event.name;
      if (!groups[key]) {
        groups[key] = { cache: [], api: [] };
      }
      
      if (event.metadata?.fromCache) {
        groups[key].cache.push(event);
      } else {
        groups[key].api.push(event);
      }
      
      return groups;
    }, {} as Record<string, { cache: PerformanceEvent[], api: PerformanceEvent[] }>);

    const operations = Object.keys(operationGroups).reduce((ops, key) => {
      const group = operationGroups[key];
      const cacheAvg = group.cache.length > 0 
        ? group.cache.reduce((sum, e) => sum + e.duration, 0) / group.cache.length 
        : 0;
      const apiAvg = group.api.length > 0 
        ? group.api.reduce((sum, e) => sum + e.duration, 0) / group.api.length 
        : 0;
      
      ops[key] = {
        totalCount: group.cache.length + group.api.length,
        cacheHits: group.cache.length,
        averageTime: (
          group.cache.reduce((sum, e) => sum + e.duration, 0) + 
          group.api.reduce((sum, e) => sum + e.duration, 0)
        ) / (group.cache.length + group.api.length),
        cacheAverage: cacheAvg,
        apiAverage: apiAvg
      };
      
      return ops;
    }, {} as Record<string, { totalCount: number; cacheHits: number; averageTime: number; cacheAverage: number; apiAverage: number; }>);

    return {
      cacheHitRate: (cacheHits.length / cacheEvents.length) * 100,
      averageCacheTime,
      averageApiTime,
      totalCacheOperations: cacheEvents.length,
      speedImprovement: averageApiTime > 0 ? averageApiTime / averageCacheTime : 0,
      operations
    };
  }

  /**
   * 列印快取效能報告
   */
  printCacheReport(): void {
    const report = this.getCachePerformanceReport();
    
    console.group('🚀 快取效能報告');
    console.log(`總操作數: ${report.totalCacheOperations}`);
    console.log(`快取命中率: ${report.cacheHitRate.toFixed(1)}%`);
    console.log(`快取平均時間: ${report.averageCacheTime.toFixed(2)}ms`);
    console.log(`API 平均時間: ${report.averageApiTime.toFixed(2)}ms`);
    
    if (report.speedImprovement > 1) {
      console.log(`⚡ 效能提升: ${report.speedImprovement.toFixed(1)}x 倍`);
    }
    
    console.group('各操作詳情:');
    Object.entries(report.operations).forEach(([operation, stats]) => {
      const hitRate = ((stats.cacheHits / stats.totalCount) * 100).toFixed(1);
      console.log(`${operation}:`);
      console.log(`  - 總次數: ${stats.totalCount}, 快取命中: ${hitRate}%`);
      console.log(`  - 平均時間: ${stats.averageTime.toFixed(2)}ms`);
      if (stats.cacheAverage > 0 && stats.apiAverage > 0) {
        console.log(`  - 快取: ${stats.cacheAverage.toFixed(2)}ms, API: ${stats.apiAverage.toFixed(2)}ms`);
      }
    });
    console.groupEnd();
    
    console.groupEnd();
  }

  /**
   * 銷毀監控器
   */
  destroy(): void {
    // 清理觀察器
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    // 清理定時器
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
    
    // 清理事件
    this.clearEvents();
    this.isEnabled = false;
  }
}

// 全域性能監控器實例
export const performanceMonitor = new PerformanceMonitor();

// React Hook 用於組件性能監控
export const usePerformanceMonitor = () => {
  return {
    startRender: (componentName: string) => performanceMonitor.startComponentRender(componentName),
    measureInteraction: (name: string, action: () => void) => 
      performanceMonitor.measureUserInteraction(name, action),
    measureBlockOperation: (name: string, operation: () => void) =>
      performanceMonitor.measureBlockOperation(name, operation),
    measureCacheOperation: <T>(name: string, operation: () => T, fromCache?: boolean) =>
      performanceMonitor.measureCacheOperation(name, operation, fromCache),
    measureDataFetch: <T>(name: string, operation: () => Promise<T>, fromCache?: boolean) =>
      performanceMonitor.measureDataFetch(name, operation, fromCache),
    measureAuthCheck: <T>(operation: () => Promise<T>, fromCache?: boolean) =>
      performanceMonitor.measureAuthCheck(operation, fromCache),
    getMetrics: () => performanceMonitor.getRealTimeMetrics(),
    getAnalysis: () => performanceMonitor.getPerformanceAnalysis(),
    getCacheReport: () => performanceMonitor.getCachePerformanceReport(),
    printCacheReport: () => performanceMonitor.printCacheReport()
  };
};

export default PerformanceMonitor;