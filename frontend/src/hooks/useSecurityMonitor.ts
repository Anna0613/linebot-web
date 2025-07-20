/**
 * 安全監控Hook - 為組件提供實時安全監控功能
 */

import { useState, useEffect, useCallback } from 'react';
import { securityMonitor } from '../utils/securityMonitor';
import { migrationHelper } from '../utils/migrationHelper';

interface SecurityData {
  metrics: any;
  events: any[];
  alerts: string[];
  recommendations: string[];
  suspiciousActivity: any;
  migrationStatus: any;
  isMonitoring: boolean;
  lastUpdate: number;
}

interface UseSecurityMonitorOptions {
  enableRealTime?: boolean;
  updateInterval?: number;
  maxEvents?: number;
  autoStart?: boolean;
}

export const useSecurityMonitor = (options: UseSecurityMonitorOptions = {}) => {
  const {
    enableRealTime = true,
    updateInterval = 5000,
    maxEvents = 50,
    autoStart = true
  } = options;

  const [data, setData] = useState<SecurityData>({
    metrics: {},
    events: [],
    alerts: [],
    recommendations: [],
    suspiciousActivity: { detected: false, reasons: [], riskLevel: 'low' },
    migrationStatus: { phase: 'not_started', currentStep: '', completedSteps: [], errors: [] },
    isMonitoring: false,
    lastUpdate: 0
  });

  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // 獲取監控數據
  const fetchSecurityData = useCallback(() => {
    try {
      const report = securityMonitor.generateSecurityReport();
      const migration = migrationHelper.getStatus();
      const suspicious = securityMonitor.detectSuspiciousActivity();

      setData(prev => ({
        ...prev,
        metrics: report.summary,
        events: report.events.slice(-maxEvents),
        alerts: report.alerts,
        recommendations: report.recommendations,
        suspiciousActivity: suspicious,
        migrationStatus: migration,
        lastUpdate: Date.now()
      }));
    } catch (error) {
      console.error('獲取安全監控數據失敗:', error);
    }
  }, [maxEvents]);

  // 啟動實時監控
  const startMonitoring = useCallback(() => {
    if (!enableRealTime || intervalId) return;

    fetchSecurityData();
    const id = setInterval(fetchSecurityData, updateInterval);
    setIntervalId(id);
    setData(prev => ({ ...prev, isMonitoring: true }));

    console.log('🔐 安全監控已啟動');
  }, [enableRealTime, intervalId, fetchSecurityData, updateInterval]);

  // 停止監控
  const stopMonitoring = useCallback(() => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setData(prev => ({ ...prev, isMonitoring: false }));

    console.log('🔐 安全監控已停止');
  }, [intervalId]);

  // 手動刷新數據
  const refreshData = useCallback(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

  // 記錄自定義安全事件
  const logSecurityEvent = useCallback((
    type: 'auth_success' | 'auth_failure' | 'token_expired' | 'security_violation' | 'migration_event',
    details: Record<string, any> = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'low',
    userId?: string
  ) => {
    securityMonitor.logEvent(type, details, severity, userId);
    
    // 如果不在實時監控模式，手動刷新數據
    if (!data.isMonitoring) {
      fetchSecurityData();
    }
  }, [data.isMonitoring, fetchSecurityData]);

  // 檢查特定類型的安全問題
  const checkSecurityIssues = useCallback(() => {
    const issues = [];

    // 檢查認證失敗率
    if (data.metrics.totalAuthAttempts > 0) {
      const failureRate = data.metrics.failedAuthAttempts / data.metrics.totalAuthAttempts;
      if (failureRate > 0.3) {
        issues.push({
          type: 'high_failure_rate',
          severity: 'high',
          message: `認證失敗率過高: ${(failureRate * 100).toFixed(1)}%`
        });
      }
    }

    // 檢查安全違規
    if (data.metrics.securityViolations > 0) {
      issues.push({
        type: 'security_violations',
        severity: 'high',
        message: `檢測到 ${data.metrics.securityViolations} 個安全違規`
      });
    }

    // 檢查可疑活動
    if (data.suspiciousActivity.detected) {
      issues.push({
        type: 'suspicious_activity',
        severity: data.suspiciousActivity.riskLevel,
        message: `可疑活動: ${data.suspiciousActivity.reasons.join(', ')}`
      });
    }

    return issues;
  }, [data.metrics, data.suspiciousActivity]);

  // 獲取安全評分
  const getSecurityScore = useCallback(() => {
    let score = 100;
    const issues = checkSecurityIssues();

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }, [checkSecurityIssues]);

  // 匯出安全數據
  const exportSecurityData = useCallback((format: 'json' | 'csv' = 'json') => {
    if (format === 'json') {
      return securityMonitor.exportSecurityData();
    } else {
      // 簡單的CSV格式
      const headers = ['timestamp', 'type', 'severity', 'details'];
      const csvData = data.events.map(event => [
        new Date(event.timestamp).toISOString(),
        event.type,
        event.severity,
        JSON.stringify(event.details)
      ]);
      
      return [headers, ...csvData]
        .map(row => row.join(','))
        .join('\n');
    }
  }, [data.events]);

  // 自動啟動監控
  useEffect(() => {
    if (autoStart) {
      startMonitoring();
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoStart, startMonitoring]);

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
    securityScore: getSecurityScore(),
    securityIssues: checkSecurityIssues(),
    
    // 控制方法
    startMonitoring,
    stopMonitoring,
    refreshData,
    
    // 事件記錄
    logSecurityEvent,
    
    // 工具方法
    exportSecurityData,
    
    // 狀態
    isMonitoring: data.isMonitoring,
    lastUpdate: data.lastUpdate,
    
    // 快捷方法
    logAuthSuccess: (userId: string, method: string) => 
      logSecurityEvent('auth_success', { method }, 'low', userId),
    
    logAuthFailure: (reason: string, attemptedUser?: string) =>
      logSecurityEvent('auth_failure', { reason }, 'medium', attemptedUser),
    
    logSecurityViolation: (violation: string, details: Record<string, any> = {}) =>
      logSecurityEvent('security_violation', { violation, ...details }, 'high'),
    
    logMigrationEvent: (phase: string, status: string, details: Record<string, any> = {}) =>
      logSecurityEvent('migration_event', { phase, status, ...details }, 
        status === 'error' ? 'high' : 'low')
  };
};