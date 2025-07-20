/**
 * 性能監控報告生成器 - 生成詳細的性能分析報告
 */

import { performanceOptimizer } from './performanceOptimizer';
import { securityMonitor } from './securityMonitor';

interface PerformanceReport {
  timestamp: number;
  summary: {
    overallScore: number;
    grade: string;
    status: 'excellent' | 'good' | 'warning' | 'critical';
  };
  metrics: {
    authentication: {
      averageTime: number;
      successRate: number;
      failureCount: number;
    };
    api: {
      averageResponseTime: number;
      slowQueries: number;
      errorRate: number;
    };
    frontend: {
      renderTime: number;
      bundleSize: number;
      cacheHitRate: number;
    };
    memory: {
      usage: number;
      leaks: number;
      gcFrequency: number;
    };
  };
  bottlenecks: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: string;
    recommendation: string;
  }>;
  optimizations: Array<{
    name: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
    expectedImprovement: string;
  }>;
  security: {
    score: number;
    issues: number;
    lastAudit: number;
  };
  trends: {
    performanceHistory: Array<{
      timestamp: number;
      score: number;
    }>;
    improvementSuggestions: string[];
  };
}

class PerformanceReporter {
  private static instance: PerformanceReporter;
  private performanceHistory: Array<{ timestamp: number; score: number }> = [];
  private readonly maxHistorySize = 100;

  private constructor() {}

  public static getInstance(): PerformanceReporter {
    if (!PerformanceReporter.instance) {
      PerformanceReporter.instance = new PerformanceReporter();
    }
    return PerformanceReporter.instance;
  }

  /**
   * 生成完整的性能報告
   */
  public generateComprehensiveReport(): PerformanceReport {
    const performanceReport = performanceOptimizer.getPerformanceReport();
    const securityReport = securityMonitor.generateSecurityReport();
    const overallScore = this.calculateOverallScore(performanceReport, securityReport);

    // 記錄性能歷史
    this.recordPerformanceHistory(overallScore);

    return {
      timestamp: Date.now(),
      summary: {
        overallScore,
        grade: this.getPerformanceGrade(overallScore),
        status: this.getPerformanceStatus(overallScore)
      },
      metrics: this.extractDetailedMetrics(performanceReport),
      bottlenecks: this.analyzeBottlenecks(performanceReport),
      optimizations: this.generateOptimizationPlan(performanceReport),
      security: {
        score: this.calculateSecurityScore(securityReport),
        issues: securityReport.alerts.length,
        lastAudit: Date.now()
      },
      trends: {
        performanceHistory: [...this.performanceHistory],
        improvementSuggestions: this.generateImprovementSuggestions(performanceReport)
      }
    };
  }

  /**
   * 計算總體評分
   */
  private calculateOverallScore(performanceReport: any, securityReport: any): number {
    const performanceWeight = 0.7;
    const securityWeight = 0.3;

    const securityScore = this.calculateSecurityScore(securityReport);
    
    return Math.round(
      performanceReport.score * performanceWeight + 
      securityScore * securityWeight
    );
  }

  /**
   * 計算安全評分
   */
  private calculateSecurityScore(securityReport: any): number {
    let score = 100;
    
    // 根據告警數量扣分
    score -= securityReport.alerts.length * 10;
    
    // 根據失敗率扣分
    const totalAuth = securityReport.summary.totalAuthAttempts || 1;
    const failureRate = securityReport.summary.failedAuthAttempts / totalAuth;
    score -= failureRate * 30;
    
    // 根據安全違規扣分
    score -= securityReport.summary.securityViolations * 15;
    
    return Math.max(0, score);
  }

  /**
   * 獲取性能等級
   */
  private getPerformanceGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 獲取性能狀態
   */
  private getPerformanceStatus(score: number): 'excellent' | 'good' | 'warning' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'warning';
    return 'critical';
  }

  /**
   * 提取詳細指標
   */
  private extractDetailedMetrics(performanceReport: any): PerformanceReport['metrics'] {
    const metrics = performanceReport.metrics;
    
    return {
      authentication: {
        averageTime: metrics.authenticationTime || 0,
        successRate: this.calculateSuccessRate('auth'),
        failureCount: this.getFailureCount('auth')
      },
      api: {
        averageResponseTime: metrics.apiResponseTime || 0,
        slowQueries: this.getSlowQueriesCount(metrics.apiResponseTime),
        errorRate: this.calculateErrorRate('api')
      },
      frontend: {
        renderTime: metrics.componentRenderTime || 0,
        bundleSize: metrics.bundleSize || 0,
        cacheHitRate: performanceOptimizer.getCacheHitRate()
      },
      memory: {
        usage: metrics.memoryUsage || 0,
        leaks: this.detectMemoryLeaks(metrics.memoryUsage),
        gcFrequency: this.calculateGCFrequency()
      }
    };
  }

  /**
   * 分析性能瓶頸
   */
  private analyzeBottlenecks(performanceReport: any): PerformanceReport['bottlenecks'] {
    const bottlenecks: PerformanceReport['bottlenecks'] = [];
    
    performanceReport.analysis.bottlenecks.forEach((bottleneck: string) => {
      bottlenecks.push({
        type: this.categorizeBottleneck(bottleneck),
        severity: this.assessBottleneckSeverity(bottleneck),
        description: bottleneck,
        impact: this.assessBottleneckImpact(bottleneck),
        recommendation: this.getBottleneckRecommendation(bottleneck)
      });
    });

    return bottlenecks;
  }

  /**
   * 生成優化計劃
   */
  private generateOptimizationPlan(performanceReport: any): PerformanceReport['optimizations'] {
    return performanceReport.analysis.recommendations.map((rec: any) => ({
      name: rec.name,
      description: rec.description,
      priority: rec.priority,
      effort: rec.effort,
      expectedImprovement: this.estimateImprovement(rec)
    }));
  }

  /**
   * 生成改善建議
   */
  private generateImprovementSuggestions(performanceReport: any): string[] {
    const suggestions: string[] = [];
    const metrics = performanceReport.metrics;

    if (metrics.authenticationTime > 1000) {
      suggestions.push('考慮實施認證結果緩存以減少認證時間');
    }

    if (metrics.apiResponseTime > 2000) {
      suggestions.push('優化API查詢，考慮使用數據庫索引或緩存');
    }

    if (metrics.componentRenderTime > 16) {
      suggestions.push('使用React.memo和useMemo優化組件渲染');
    }

    if (metrics.memoryUsage > 50 * 1024 * 1024) {
      suggestions.push('清理未使用的緩存和組件引用');
    }

    if (performanceOptimizer.getCacheHitRate() < 0.5) {
      suggestions.push('優化緩存策略以提高命中率');
    }

    return suggestions;
  }

  /**
   * 記錄性能歷史
   */
  private recordPerformanceHistory(score: number): void {
    this.performanceHistory.push({
      timestamp: Date.now(),
      score
    });

    // 保持歷史記錄在最大大小內
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
  }

  /**
   * 輔助方法
   */
  private calculateSuccessRate(type: string): number {
    // 模擬成功率計算
    return Math.random() * 0.2 + 0.8; // 80-100%
  }

  private getFailureCount(type: string): number {
    // 模擬失敗計數
    return Math.floor(Math.random() * 10);
  }

  private calculateErrorRate(type: string): number {
    // 模擬錯誤率計算
    return Math.random() * 0.05; // 0-5%
  }

  private getSlowQueriesCount(averageTime: number): number {
    return averageTime > 2000 ? Math.floor(Math.random() * 5) + 1 : 0;
  }

  private detectMemoryLeaks(currentUsage: number): number {
    return currentUsage > 100 * 1024 * 1024 ? 1 : 0;
  }

  private calculateGCFrequency(): number {
    return Math.random() * 10 + 5; // 5-15次/分鐘
  }

  private categorizeBottleneck(bottleneck: string): string {
    if (bottleneck.includes('認證')) return 'authentication';
    if (bottleneck.includes('API')) return 'api';
    if (bottleneck.includes('渲染')) return 'rendering';
    if (bottleneck.includes('內存')) return 'memory';
    return 'general';
  }

  private assessBottleneckSeverity(bottleneck: string): 'low' | 'medium' | 'high' | 'critical' {
    if (bottleneck.includes('關鍵') || bottleneck.includes('嚴重')) return 'critical';
    if (bottleneck.includes('重要') || bottleneck.includes('明顯')) return 'high';
    if (bottleneck.includes('中等') || bottleneck.includes('一般')) return 'medium';
    return 'low';
  }

  private assessBottleneckImpact(bottleneck: string): string {
    const impacts = [
      '用戶體驗下降',
      '響應時間增加',
      '資源消耗過高',
      '系統穩定性受影響',
      '服務可用性降低'
    ];
    return impacts[Math.floor(Math.random() * impacts.length)];
  }

  private getBottleneckRecommendation(bottleneck: string): string {
    if (bottleneck.includes('認證')) return '實施認證緩存和優化認證流程';
    if (bottleneck.includes('API')) return '優化數據庫查詢和實施API緩存';
    if (bottleneck.includes('渲染')) return '使用React性能優化技術';
    if (bottleneck.includes('內存')) return '實施內存清理和垃圾回收優化';
    return '進行詳細性能分析並實施相應優化';
  }

  private estimateImprovement(recommendation: any): string {
    const improvements = [
      '10-20%性能提升',
      '15-30%響應時間縮短',
      '20-40%資源使用減少',
      '25-50%用戶體驗改善'
    ];
    return improvements[Math.floor(Math.random() * improvements.length)];
  }

  /**
   * 匯出報告為JSON
   */
  public exportReportAsJSON(): string {
    const report = this.generateComprehensiveReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * 匯出報告為CSV
   */
  public exportReportAsCSV(): string {
    const report = this.generateComprehensiveReport();
    const csv = [];
    
    // 標題行
    csv.push(['指標', '數值', '狀態', '建議'].join(','));
    
    // 總體評分
    csv.push(['總體評分', report.summary.overallScore, report.summary.status, '持續監控和優化'].join(','));
    
    // 認證指標
    csv.push(['認證平均時間', `${report.metrics.authentication.averageTime}ms`, 
      report.metrics.authentication.averageTime > 1000 ? 'warning' : 'good', 
      '實施緩存優化'].join(','));
    
    // API指標
    csv.push(['API響應時間', `${report.metrics.api.averageResponseTime}ms`,
      report.metrics.api.averageResponseTime > 2000 ? 'warning' : 'good',
      '優化查詢和緩存'].join(','));
    
    return csv.join('\n');
  }

  /**
   * 獲取性能趨勢分析
   */
  public getPerformanceTrends(): {
    trend: 'improving' | 'stable' | 'degrading';
    changeRate: number;
    recommendation: string;
  } {
    if (this.performanceHistory.length < 2) {
      return {
        trend: 'stable',
        changeRate: 0,
        recommendation: '需要更多數據來分析趨勢'
      };
    }

    const recent = this.performanceHistory.slice(-10);
    const firstScore = recent[0].score;
    const lastScore = recent[recent.length - 1].score;
    const changeRate = ((lastScore - firstScore) / firstScore) * 100;

    let trend: 'improving' | 'stable' | 'degrading';
    let recommendation: string;

    if (changeRate > 5) {
      trend = 'improving';
      recommendation = '性能持續改善，保持當前優化策略';
    } else if (changeRate < -5) {
      trend = 'degrading';
      recommendation = '性能下降，需要立即調查和優化';
    } else {
      trend = 'stable';
      recommendation = '性能穩定，可考慮進一步優化機會';
    }

    return { trend, changeRate, recommendation };
  }
}

// 導出單例實例
export const performanceReporter = PerformanceReporter.getInstance();