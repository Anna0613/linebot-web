/**
 * 安全監控系統 - 實時監控認證狀態和安全事件
 * 提供異常檢測、告警機制和安全指標收集
 */

interface SecurityEvent {
  type: 'auth_success' | 'auth_failure' | 'token_expired' | 'security_violation' | 'migration_event';
  timestamp: number;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sessionId: string;
}

interface SecurityMetrics {
  totalAuthAttempts: number;
  failedAuthAttempts: number;
  successfulAuthAttempts: number;
  tokenRefreshCount: number;
  securityViolations: number;
  migrationEvents: number;
  lastEventTime: number;
}

interface MonitoringConfig {
  enableLogging: boolean;
  enableAlerting: boolean;
  alertThresholds: {
    failureRate: number; // 失敗率閾值 (0-1)
    suspiciousActivity: number; // 可疑活動閾值
    tokenRefreshFrequency: number; // Token刷新頻率閾值
  };
  retentionDays: number;
}

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private events: SecurityEvent[] = [];
  private metrics: SecurityMetrics;
  private config: MonitoringConfig;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.metrics = this.initializeMetrics();
    this.config = this.getMonitoringConfig();
    
    // 啟動週期性清理
    this.startPeriodicCleanup();
  }

  public static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  /**
   * 記錄安全事件
   */
  public logEvent(
    type: SecurityEvent['type'],
    details: Record<string, any> = {},
    severity: SecurityEvent['severity'] = 'low',
    userId?: string
  ): void {
    const event: SecurityEvent = {
      type,
      timestamp: Date.now(),
      details: this.sanitizeDetails(details),
      severity,
      userId,
      sessionId: this.sessionId,
    };

    this.events.push(event);
    this.updateMetrics(event);

    if (this.config.enableLogging) {
      this.logToConsole(event);
    }

    if (this.config.enableAlerting) {
      this.checkAlertConditions(event);
    }

    // 限制事件數量以防止內存洩漏
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }
  }

  /**
   * 記錄認證成功事件
   */
  public logAuthSuccess(userId: string, method: 'traditional' | 'line' | 'oauth'): void {
    this.logEvent('auth_success', {
      method,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    }, 'low', userId);
  }

  /**
   * 記錄認證失敗事件
   */
  public logAuthFailure(reason: string, attemptedUser?: string): void {
    this.logEvent('auth_failure', {
      reason,
      attemptedUser,
      userAgent: navigator.userAgent,
      ip: this.getClientInfo(),
    }, 'medium', attemptedUser);
  }

  /**
   * 記錄Token過期事件
   */
  public logTokenExpired(userId?: string): void {
    this.logEvent('token_expired', {
      userAgent: navigator.userAgent,
      lastActivity: this.getLastActivityTime(),
    }, 'low', userId);
  }

  /**
   * 記錄安全違規事件
   */
  public logSecurityViolation(violation: string, details: Record<string, any> = {}): void {
    this.logEvent('security_violation', {
      violation,
      ...details,
      userAgent: navigator.userAgent,
      url: window.location.href,
    }, 'high');
  }

  /**
   * 記錄遷移事件
   */
  public logMigrationEvent(phase: string, status: 'start' | 'success' | 'error', details: Record<string, any> = {}): void {
    this.logEvent('migration_event', {
      phase,
      status,
      ...details,
    }, status === 'error' ? 'high' : 'low');
  }

  /**
   * 獲取安全指標
   */
  public getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * 獲取最近的安全事件
   */
  public getRecentEvents(limit: number = 50): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * 獲取特定類型的事件
   */
  public getEventsByType(type: SecurityEvent['type'], limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(event => event.type === type)
      .slice(-limit);
  }

  /**
   * 檢查是否存在可疑活動
   */
  public detectSuspiciousActivity(): {
    detected: boolean;
    reasons: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // 檢查失敗率
    const recentFailures = this.getRecentEventsByTimeframe(5 * 60 * 1000) // 5分鐘內
      .filter(event => event.type === 'auth_failure');
    
    if (recentFailures.length >= this.config.alertThresholds.suspiciousActivity) {
      reasons.push(`短時間內登入失敗次數過多: ${recentFailures.length}`);
      riskLevel = 'high';
    }

    // 檢查Token異常
    const recentTokenEvents = this.getRecentEventsByTimeframe(10 * 60 * 1000)
      .filter(event => event.type === 'token_expired');
    
    if (recentTokenEvents.length >= this.config.alertThresholds.tokenRefreshFrequency) {
      reasons.push(`Token異常過期頻率: ${recentTokenEvents.length}`);
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
    }

    // 檢查安全違規
    const recentViolations = this.getRecentEventsByTimeframe(30 * 60 * 1000)
      .filter(event => event.type === 'security_violation');
    
    if (recentViolations.length > 0) {
      reasons.push(`檢測到安全違規: ${recentViolations.length}`);
      riskLevel = 'high';
    }

    return {
      detected: reasons.length > 0,
      reasons,
      riskLevel,
    };
  }

  /**
   * 生成安全報告
   */
  public generateSecurityReport(): {
    summary: SecurityMetrics;
    events: SecurityEvent[];
    alerts: string[];
    recommendations: string[];
  } {
    const suspiciousActivity = this.detectSuspiciousActivity();
    const alerts: string[] = [];
    const recommendations: string[] = [];

    if (suspiciousActivity.detected) {
      alerts.push(...suspiciousActivity.reasons);
    }

    // 計算失敗率
    if (this.metrics.totalAuthAttempts > 0) {
      const failureRate = this.metrics.failedAuthAttempts / this.metrics.totalAuthAttempts;
      if (failureRate > this.config.alertThresholds.failureRate) {
        alerts.push(`認證失敗率過高: ${(failureRate * 100).toFixed(1)}%`);
        recommendations.push('檢查認證邏輯和用戶體驗');
      }
    }

    // 遷移建議
    const migrationEvents = this.getEventsByType('migration_event', 100);
    const migrationErrors = migrationEvents.filter(e => e.details.status === 'error');
    
    if (migrationErrors.length > 0) {
      alerts.push(`遷移過程中發現 ${migrationErrors.length} 個錯誤`);
      recommendations.push('檢查遷移日誌並修復錯誤');
    }

    return {
      summary: this.getMetrics(),
      events: this.getRecentEvents(100),
      alerts,
      recommendations,
    };
  }

  /**
   * 導出安全數據（用於分析）
   */
  public exportSecurityData(): string {
    const data = {
      metrics: this.getMetrics(),
      events: this.events,
      generatedAt: new Date().toISOString(),
      sessionId: this.sessionId,
    };
    
    return JSON.stringify(data, null, 2);
  }

  // 私有方法
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMetrics(): SecurityMetrics {
    return {
      totalAuthAttempts: 0,
      failedAuthAttempts: 0,
      successfulAuthAttempts: 0,
      tokenRefreshCount: 0,
      securityViolations: 0,
      migrationEvents: 0,
      lastEventTime: Date.now(),
    };
  }

  private getMonitoringConfig(): MonitoringConfig {
    return {
      enableLogging: process.env.NODE_ENV === 'development',
      enableAlerting: true,
      alertThresholds: {
        failureRate: 0.3, // 30%失敗率
        suspiciousActivity: 5, // 5次可疑活動
        tokenRefreshFrequency: 10, // 10次token刷新
      },
      retentionDays: 7,
    };
  }

  private updateMetrics(event: SecurityEvent): void {
    this.metrics.lastEventTime = event.timestamp;

    switch (event.type) {
      case 'auth_success':
        this.metrics.totalAuthAttempts++;
        this.metrics.successfulAuthAttempts++;
        break;
      case 'auth_failure':
        this.metrics.totalAuthAttempts++;
        this.metrics.failedAuthAttempts++;
        break;
      case 'token_expired':
        this.metrics.tokenRefreshCount++;
        break;
      case 'security_violation':
        this.metrics.securityViolations++;
        break;
      case 'migration_event':
        this.metrics.migrationEvents++;
        break;
    }
  }

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };
    
    // 移除敏感信息
    const sensitiveKeys = ['password', 'token', 'access_token', 'refresh_token', 'secret'];
    sensitiveKeys.forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private logToConsole(event: SecurityEvent): void {
    const logMethod = event.severity === 'high' || event.severity === 'critical' 
      ? console.error 
      : event.severity === 'medium' 
        ? console.warn 
        : console.log;

    logMethod(`[Security Monitor] ${event.type}:`, {
      severity: event.severity,
      details: event.details,
      timestamp: new Date(event.timestamp).toISOString(),
    });
  }

  private checkAlertConditions(event: SecurityEvent): void {
    // 即時告警條件
    if (event.severity === 'critical') {
      this.triggerAlert('CRITICAL', `嚴重安全事件: ${event.type}`, event);
    }

    // 累積告警檢查
    const suspiciousActivity = this.detectSuspiciousActivity();
    if (suspiciousActivity.detected && suspiciousActivity.riskLevel === 'high') {
      this.triggerAlert('HIGH', '檢測到可疑活動', event);
    }
  }

  private triggerAlert(level: string, message: string, event: SecurityEvent): void {
    console.warn(`[SECURITY ALERT - ${level}] ${message}`, {
      event,
      timestamp: new Date().toISOString(),
    });

    // 在實際應用中，這裡可以發送到監控系統或通知服務
    // 例如：Sentry, DataDog, 或自定義監控端點
  }

  private getRecentEventsByTimeframe(timeframeMs: number): SecurityEvent[] {
    const cutoff = Date.now() - timeframeMs;
    return this.events.filter(event => event.timestamp >= cutoff);
  }

  private getClientInfo(): string {
    // 簡單的客戶端信息（不包含真實IP）
    return `${navigator.language}-${navigator.platform}`;
  }

  private getLastActivityTime(): number {
    return this.metrics.lastEventTime;
  }

  private startPeriodicCleanup(): void {
    // 每小時清理一次過期事件
    setInterval(() => {
      const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
      const cutoff = Date.now() - retentionMs;
      
      this.events = this.events.filter(event => event.timestamp >= cutoff);
    }, 60 * 60 * 1000); // 1小時
  }
}

// 導出單例實例
export const securityMonitor = SecurityMonitor.getInstance();