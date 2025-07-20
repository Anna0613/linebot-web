/**
 * 性能監控Hook - 為組件提供性能監控和優化功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { performanceOptimizer } from '../utils/performanceOptimizer';

interface PerformanceData {
  metrics: any;
  bottlenecks: string[];
  recommendations: any[];
  score: number;
  isMonitoring: boolean;
  lastUpdate: number;
}

interface UsePerformanceMonitorOptions {
  enableRealTime?: boolean;
  updateInterval?: number;
  autoOptimize?: boolean;
  componentName?: string;
}

export const usePerformanceMonitor = (options: UsePerformanceMonitorOptions = {}) => {
  const {
    enableRealTime = false,
    updateInterval = 30000, // 30秒
    autoOptimize = false,
    componentName = 'unknown-component'
  } = options;

  const [data, setData] = useState<PerformanceData>({
    metrics: {},
    bottlenecks: [],
    recommendations: [],
    score: 100,
    isMonitoring: false,
    lastUpdate: 0
  });

  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const measurementRef = useRef<string | null>(null);

  // 獲取性能數據
  const fetchPerformanceData = useCallback(() => {
    try {
      const report = performanceOptimizer.getPerformanceReport();
      
      setData(prev => ({
        ...prev,
        metrics: report.metrics,
        bottlenecks: report.analysis.bottlenecks,
        recommendations: report.analysis.recommendations,
        score: report.score,
        lastUpdate: Date.now()
      }));
    } catch (error) {
      console.error('獲取性能數據失敗:', error);
    }
  }, []);

  // 啟動實時監控
  const startMonitoring = useCallback(() => {
    if (!enableRealTime || intervalId) return;

    fetchPerformanceData();
    const id = setInterval(fetchPerformanceData, updateInterval);
    setIntervalId(id);
    setData(prev => ({ ...prev, isMonitoring: true }));

    console.log('⚡ 性能監控已啟動');
  }, [enableRealTime, intervalId, fetchPerformanceData, updateInterval]);

  // 停止監控
  const stopMonitoring = useCallback(() => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setData(prev => ({ ...prev, isMonitoring: false }));

    console.log('⚡ 性能監控已停止');
  }, [intervalId]);

  // 開始性能測量
  const startMeasure = useCallback((measureName?: string) => {
    const name = measureName || `${componentName}-render`;
    measurementRef.current = name;
    performanceOptimizer.startMeasure(name);
  }, [componentName]);

  // 結束性能測量
  const endMeasure = useCallback(() => {
    if (measurementRef.current) {
      const duration = performanceOptimizer.endMeasure(measurementRef.current);
      measurementRef.current = null;
      return duration;
    }
    return 0;
  }, []);

  // 設置緩存
  const setCache = useCallback((key: string, value: any, ttl?: number) => {
    performanceOptimizer.setCache(key, value, ttl);
  }, []);

  // 獲取緩存
  const getCache = useCallback(<T>(key: string): T | null => {
    return performanceOptimizer.getCache<T>(key);
  }, []);

  // 手動觸發優化
  const triggerOptimization = useCallback(() => {
    performanceOptimizer.autoOptimize();
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  // 獲取性能建議
  const getOptimizationRecommendations = useCallback(() => {
    const { recommendations } = performanceOptimizer.analyzeBottlenecks();
    return recommendations.filter(rec => rec.priority === 'high' || rec.impact === 'high');
  }, []);

  // 執行高優先級建議
  const executeHighPriorityOptimizations = useCallback(() => {
    const recommendations = getOptimizationRecommendations();
    const executed = [];

    recommendations
      .filter(rec => rec.priority === 'high' && rec.effort === 'low')
      .forEach(rec => {
        try {
          rec.implementation();
          executed.push(rec.name);
        } catch (error) {
          console.error(`執行優化 ${rec.name} 失敗:`, error);
        }
      });

    if (executed.length > 0) {
      console.log('✅ 已執行高優先級優化:', executed);
      fetchPerformanceData();
    }

    return executed;
  }, [getOptimizationRecommendations, fetchPerformanceData]);

  // 組件性能指標
  const getComponentMetrics = useCallback(() => {
    return {
      renderTime: data.metrics.componentRenderTime || 0,
      cacheHitRate: performanceOptimizer.getCacheHitRate(),
      memoryUsage: data.metrics.memoryUsage || 0,
      score: data.score
    };
  }, [data.metrics, data.score]);

  // 效能評級
  const getPerformanceGrade = useCallback(() => {
    const score = data.score;
    if (score >= 90) return { grade: 'A', color: 'green', description: '優秀' };
    if (score >= 80) return { grade: 'B', color: 'blue', description: '良好' };
    if (score >= 70) return { grade: 'C', color: 'yellow', description: '普通' };
    if (score >= 60) return { grade: 'D', color: 'orange', description: '待改善' };
    return { grade: 'F', color: 'red', description: '需要優化' };
  }, [data.score]);

  // 自動啟動監控
  useEffect(() => {
    if (enableRealTime) {
      startMonitoring();
    } else {
      fetchPerformanceData();
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [enableRealTime, startMonitoring]);

  // 自動優化
  useEffect(() => {
    if (autoOptimize && data.score < 70) {
      executeHighPriorityOptimizations();
    }
  }, [autoOptimize, data.score, executeHighPriorityOptimizations]);

  // 組件掛載時開始測量
  useEffect(() => {
    startMeasure(`${componentName}-mount`);
    
    return () => {
      endMeasure();
    };
  }, [startMeasure, endMeasure, componentName]);

  // 清理定時器
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  return {
    // 數據
    data,
    performanceGrade: getPerformanceGrade(),
    componentMetrics: getComponentMetrics(),
    
    // 控制方法
    startMonitoring,
    stopMonitoring,
    refreshData: fetchPerformanceData,
    
    // 測量方法
    startMeasure,
    endMeasure,
    
    // 緩存方法
    setCache,
    getCache,
    
    // 優化方法
    triggerOptimization,
    executeHighPriorityOptimizations,
    getOptimizationRecommendations,
    
    // 狀態
    isMonitoring: data.isMonitoring,
    lastUpdate: data.lastUpdate,
    
    // 快捷方法
    measureRender: () => {
      startMeasure(`${componentName}-render`);
      return () => endMeasure();
    },
    
    measureAsync: async <T>(operation: () => Promise<T>, operationName?: string): Promise<T> => {
      const measureName = operationName || `${componentName}-async-operation`;
      startMeasure(measureName);
      try {
        const result = await operation();
        return result;
      } finally {
        endMeasure();
      }
    },
    
    withCache: <T>(key: string, operation: () => T, ttl?: number): T => {
      const cached = getCache<T>(key);
      if (cached !== null) {
        return cached;
      }
      
      const result = operation();
      setCache(key, result, ttl);
      return result;
    }
  };
};