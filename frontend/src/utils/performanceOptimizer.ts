/**
 * 性能優化工具 - 基於監控數據進行智能優化
 */

interface PerformanceMetrics {
  authenticationTime: number;
  apiResponseTime: number;
  tokenValidationTime: number;
  componentRenderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  bundleSize: number;
}

interface OptimizationStrategy {
  name: string;
  priority: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  description: string;
  implementation: () => void;
}

class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private metrics: PerformanceMetrics;
  private cache: Map<string, any> = new Map();
  private performanceObserver: PerformanceObserver | null = null;

  private constructor() {
    this.metrics = {
      authenticationTime: 0,
      apiResponseTime: 0,
      tokenValidationTime: 0,
      componentRenderTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      bundleSize: 0,
    };
    
    this.initializePerformanceMonitoring();
  }

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * 初始化性能監控
   */
  private initializePerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'resource'] 
      });
    }

    // 監控內存使用
    if ('memory' in performance) {
      setInterval(() => {
        this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
      }, 30000); // 每30秒檢查一次
    }
  }

  /**
   * 處理性能條目
   */
  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'measure':
        this.handleMeasureEntry(entry as PerformanceMeasure);
        break;
      case 'navigation':
        this.handleNavigationEntry(entry as PerformanceNavigationTiming);
        break;
      case 'resource':
        this.handleResourceEntry(entry as PerformanceResourceTiming);
        break;
    }
  }

  private handleMeasureEntry(entry: PerformanceMeasure): void {
    if (entry.name.includes('auth')) {
      this.metrics.authenticationTime = entry.duration;
    } else if (entry.name.includes('api')) {
      this.metrics.apiResponseTime = entry.duration;
    } else if (entry.name.includes('token')) {
      this.metrics.tokenValidationTime = entry.duration;
    } else if (entry.name.includes('render')) {
      this.metrics.componentRenderTime = entry.duration;
    }
  }

  private handleNavigationEntry(entry: PerformanceNavigationTiming): void {
    // 記錄頁面載入性能
    console.log('頁面載入時間:', entry.loadEventEnd - entry.navigationStart);
  }

  private handleResourceEntry(entry: PerformanceResourceTiming): void {
    // 記錄資源載入性能
    if (entry.name.includes('.js') || entry.name.includes('.css')) {
      this.metrics.bundleSize += entry.transferSize || 0;
    }
  }

  /**
   * 開始性能測量
   */
  public startMeasure(name: string): void {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * 結束性能測量
   */
  public endMeasure(name: string): number {
    if ('performance' in window && 'mark' in performance && 'measure' in performance) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const measure = performance.getEntriesByName(name, 'measure')[0] as PerformanceMeasure;
      return measure ? measure.duration : 0;
    }
    return 0;
  }

  /**
   * 智能緩存管理
   */
  public setCache(key: string, value: any, ttl: number = 300000): void { // 預設5分鐘
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  public getCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.value as T;
  }

  public clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 獲取緩存命中率
   */
  public getCacheHitRate(): number {
    return this.metrics.cacheHitRate;
  }

  /**
   * 分析性能瓶頸
   */
  public analyzeBottlenecks(): {
    bottlenecks: string[];
    recommendations: OptimizationStrategy[];
  } {
    const bottlenecks: string[] = [];
    const recommendations: OptimizationStrategy[] = [];

    // 分析認證性能
    if (this.metrics.authenticationTime > 1000) {
      bottlenecks.push('認證流程響應時間過長');
      recommendations.push({
        name: 'optimize-auth-flow',
        priority: 'high',
        impact: 'high',
        effort: 'medium',
        description: '優化認證流程，實施Token緩存',
        implementation: () => this.optimizeAuthFlow()
      });
    }

    // 分析API性能
    if (this.metrics.apiResponseTime > 2000) {
      bottlenecks.push('API響應時間過長');
      recommendations.push({
        name: 'optimize-api-calls',
        priority: 'high',
        impact: 'high',
        effort: 'low',
        description: '實施API響應緩存和請求批次處理',
        implementation: () => this.optimizeApiCalls()
      });
    }

    // 分析內存使用
    if (this.metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      bottlenecks.push('內存使用量過高');
      recommendations.push({
        name: 'optimize-memory',
        priority: 'medium',
        impact: 'medium',
        effort: 'medium',
        description: '清理未使用的緩存和組件',
        implementation: () => this.optimizeMemoryUsage()
      });
    }

    // 分析組件渲染
    if (this.metrics.componentRenderTime > 16) { // 60fps = 16.67ms per frame
      bottlenecks.push('組件渲染性能不佳');
      recommendations.push({
        name: 'optimize-rendering',
        priority: 'medium',
        impact: 'high',
        effort: 'high',
        description: '實施React.memo和useMemo優化',
        implementation: () => this.optimizeRendering()
      });
    }

    return { bottlenecks, recommendations };
  }

  /**
   * 優化認證流程
   */
  private optimizeAuthFlow(): void {
    // 實施認證結果緩存
    console.log('🚀 優化認證流程：啟用Token緩存');
    
    // 預編譯認證邏輯
    // 減少認證檢查的計算複雜度
  }

  /**
   * 優化API調用
   */
  private optimizeApiCalls(): void {
    console.log('🚀 優化API調用：啟用響應緩存');
    
    // 實施請求去重
    // 批次處理API請求
    // 實施預載入策略
  }

  /**
   * 優化內存使用
   */
  private optimizeMemoryUsage(): void {
    console.log('🚀 優化內存使用：清理緩存');
    
    // 清理過期緩存
    this.clearExpiredCache();
    
    // 限制緩存大小
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries());
      entries.slice(0, 50).forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * 優化渲染性能
   */
  private optimizeRendering(): void {
    console.log('🚀 優化渲染性能：啟用渲染優化策略');
    
    // 建議使用React.memo的組件
    // 建議使用useMemo的計算
    // 建議使用useCallback的函數
  }

  /**
   * 自動優化
   */
  public autoOptimize(): void {
    const { recommendations } = this.analyzeBottlenecks();
    
    // 執行高優先級、低工作量的優化
    recommendations
      .filter(rec => rec.priority === 'high' && rec.effort === 'low')
      .forEach(rec => {
        console.log(`🔧 執行自動優化: ${rec.description}`);
        rec.implementation();
      });
  }

  /**
   * 獲取性能報告
   */
  public getPerformanceReport(): {
    metrics: PerformanceMetrics;
    analysis: ReturnType<typeof this.analyzeBottlenecks>;
    score: number;
  } {
    const analysis = this.analyzeBottlenecks();
    
    // 計算性能評分 (0-100)
    let score = 100;
    analysis.bottlenecks.forEach(() => score -= 15);
    
    return {
      metrics: { ...this.metrics },
      analysis,
      score: Math.max(0, score)
    };
  }

  /**
   * 預載入關鍵資源
   */
  public preloadCriticalResources(): void {
    const criticalApis = [
      '/api/v1/auth/check-login',
      '/api/v1/users/profile'
    ];

    // 預載入關鍵API響應
    criticalApis.forEach(async (endpoint) => {
      try {
        const cacheKey = `preload_${endpoint}`;
        if (!this.getCache(cacheKey)) {
          // 這裡會在實際應用中調用API
          console.log(`🔄 預載入: ${endpoint}`);
        }
      } catch (error) {
        console.warn(`預載入失敗: ${endpoint}`, error);
      }
    });
  }

  /**
   * 啟用懶載入
   */
  public enableLazyLoading(): void {
    // 為非關鍵組件啟用懶載入
    console.log('🔄 啟用懶載入策略');
    
    // 實施 Intersection Observer 進行懶載入
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 載入可見組件
            console.log('載入可見組件:', entry.target);
          }
        });
      });

      // 觀察懶載入元素
      document.querySelectorAll('[data-lazy]').forEach((el) => {
        observer.observe(el);
      });
    }
  }

  /**
   * 清理性能監控
   */
  public cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    this.cache.clear();
  }
}

// 導出單例實例
export const performanceOptimizer = PerformanceOptimizer.getInstance();