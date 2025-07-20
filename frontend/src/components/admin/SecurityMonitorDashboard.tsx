/**
 * 安全監控儀表板 - 實時顯示認證系統狀態
 * 僅在開發環境或管理員模式下顯示
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { securityMonitor } from '../../utils/securityMonitor';
import { migrationHelper } from '../../utils/migrationHelper';
import { authManager } from '../../services/UnifiedAuthManager';

interface DashboardData {
  metrics: any;
  events: any[];
  alerts: string[];
  recommendations: string[];
  migrationStatus: any;
  suspiciousActivity: any;
}

export const SecurityMonitorDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // 檢查是否應該顯示監控面板
  useEffect(() => {
    const shouldShow = process.env.NODE_ENV === 'development' || 
                      window.location.search.includes('debug=security') ||
                      authManager.getUserInfo()?.username === 'admin';
    setIsVisible(shouldShow);
  }, []);

  // 獲取監控數據
  const fetchData = () => {
    try {
      const report = securityMonitor.generateSecurityReport();
      const migration = migrationHelper.getStatus();
      const suspicious = securityMonitor.detectSuspiciousActivity();

      setData({
        metrics: report.summary,
        events: report.events,
        alerts: report.alerts,
        recommendations: report.recommendations,
        migrationStatus: migration,
        suspiciousActivity: suspicious
      });
    } catch (error) {
      console.error('獲取監控數據失敗:', error);
    }
  };

  // 啟動實時監控
  const startRealTimeMonitoring = () => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // 每5秒更新
    setRefreshInterval(interval);
  };

  // 停止監控
  const stopMonitoring = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  useEffect(() => {
    if (isVisible) {
      startRealTimeMonitoring();
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const formatPercentage = (numerator: number, denominator: number) => {
    if (denominator === 0) return '0%';
    return `${((numerator / denominator) * 100).toFixed(1)}%`;
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] overflow-hidden bg-white border rounded-lg shadow-lg z-50">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">🔐 安全監控</h3>
          <div className="flex gap-2">
            <Badge variant={refreshInterval ? "default" : "secondary"}>
              {refreshInterval ? "🟢 即時監控" : "⏸️ 已暫停"}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsVisible(false)}
            >
              ✕
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 max-h-[70vh] overflow-y-auto">
        {!data ? (
          <div className="text-center py-4">載入中...</div>
        ) : (
          <Tabs defaultValue="metrics" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="metrics">指標</TabsTrigger>
              <TabsTrigger value="events">事件</TabsTrigger>
              <TabsTrigger value="alerts">告警</TabsTrigger>
              <TabsTrigger value="migration">遷移</TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">認證成功率</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercentage(
                        data.metrics.successfulAuthAttempts,
                        data.metrics.totalAuthAttempts
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {data.metrics.successfulAuthAttempts}/{data.metrics.totalAuthAttempts}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">失敗次數</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {data.metrics.failedAuthAttempts}
                    </div>
                    <div className="text-xs text-gray-500">
                      安全違規: {data.metrics.securityViolations}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Token刷新</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {data.metrics.tokenRefreshCount}
                    </div>
                    <div className="text-xs text-gray-500">次數</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">遷移事件</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {data.metrics.migrationEvents}
                    </div>
                    <div className="text-xs text-gray-500">次數</div>
                  </CardContent>
                </Card>
              </div>

              {data.suspiciousActivity.detected && (
                <Alert>
                  <AlertDescription>
                    <strong>⚠️ 檢測到可疑活動:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {data.suspiciousActivity.reasons.map((reason: string, index: number) => (
                        <li key={index} className="text-sm">{reason}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="events" className="space-y-2">
              <div className="text-sm font-medium mb-2">最近事件 (最新10條)</div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.events.slice(-10).reverse().map((event: any, index: number) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                    <div className="flex items-center justify-between">
                      <Badge variant={getRiskLevelColor(event.severity)} className="text-xs">
                        {event.type}
                      </Badge>
                      <span className="text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {event.details && Object.keys(event.details).length > 0 && (
                      <div className="mt-1 text-gray-600">
                        {JSON.stringify(event.details, null, 1).slice(0, 100)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-2">
              <div className="text-sm font-medium mb-2">
                當前告警 ({data.alerts.length})
              </div>
              {data.alerts.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  ✅ 無告警
                </div>
              ) : (
                <div className="space-y-2">
                  {data.alerts.map((alert: string, index: number) => (
                    <Alert key={index}>
                      <AlertDescription className="text-sm">
                        🚨 {alert}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {data.recommendations.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">建議</div>
                  <div className="space-y-1">
                    {data.recommendations.map((rec: string, index: number) => (
                      <div key={index} className="text-sm text-blue-600">
                        💡 {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="migration" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">遷移狀態</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>階段:</span>
                      <Badge variant={
                        data.migrationStatus.phase === 'completed' ? 'default' :
                        data.migrationStatus.phase === 'failed' ? 'destructive' :
                        'secondary'
                      }>
                        {data.migrationStatus.phase}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>當前步驟:</span>
                      <span className="text-sm text-gray-600">
                        {data.migrationStatus.currentStep || '無'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>已完成步驟:</span>
                      <span className="text-sm text-gray-600">
                        {data.migrationStatus.completedSteps.length}
                      </span>
                    </div>

                    {data.migrationStatus.errors.length > 0 && (
                      <div className="mt-2">
                        <div className="text-sm font-medium text-red-600">錯誤:</div>
                        {data.migrationStatus.errors.map((error: string, index: number) => (
                          <div key={index} className="text-xs text-red-500 ml-2">
                            • {error}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={async () => {
                    const needs = migrationHelper.needsMigration();
                    if (needs) {
                      await migrationHelper.autoMigrateIfNeeded();
                      fetchData();
                    }
                  }}
                >
                  檢查遷移
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    const report = securityMonitor.exportSecurityData();
                    const blob = new Blob([report], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `security-report-${Date.now()}.json`;
                    a.click();
                  }}
                >
                  匯出數據
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <div className="p-2 border-t bg-gray-50 text-xs text-gray-500 text-center">
        最後更新: {data ? new Date().toLocaleTimeString() : '未知'}
      </div>
    </div>
  );
};