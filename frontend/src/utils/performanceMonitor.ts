/**
 * 性能監控工具
 * 提供性能指標收集、分析和優化建議
 */

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
  | 'page-load';

// 性能事件詳情
interface PerformanceEvent {
  type: PerformanceEventType;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, any>;
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
              transferSize: (entry as any).transferSize
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
    if (typeof window === 'undefined' || !(window.performance as any).memory) {
      return;
    }

    this.memoryCheckInterval = setInterval(() => {
      const memory = (window.performance as any).memory;
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
    
    const memoryUsage = typeof window !== 'undefined' && (window.performance as any).memory
      ? (window.performance as any).memory.usedJSHeapSize / 1024 / 1024 // MB
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
    getMetrics: () => performanceMonitor.getRealTimeMetrics(),
    getAnalysis: () => performanceMonitor.getPerformanceAnalysis()
  };
};

export default PerformanceMonitor;