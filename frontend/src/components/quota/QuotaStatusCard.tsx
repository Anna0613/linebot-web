import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Infinity, RefreshCw, TrendingUp } from 'lucide-react';
import { QuotaStatus } from '@/hooks/useQuotaStatus';
import { Loader } from '@/components/ui/loader';

interface QuotaStatusCardProps {
  quotaStatus: QuotaStatus | null;
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void;
  compact?: boolean; // 緊湊模式，用於嵌入其他卡片
}

/**
 * 配額狀態顯示卡片
 */
export function QuotaStatusCard({
  quotaStatus,
  isLoading,
  error,
  onRefresh,
  compact = false
}: QuotaStatusCardProps) {
  // 載入中狀態
  if (isLoading && !quotaStatus) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader size="sm" />
        <span className="ml-2 text-sm text-muted-foreground">載入配額資訊...</span>
      </div>
    );
  }

  // 錯誤狀態
  if (error || quotaStatus?.error) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        <span>{error || quotaStatus?.error || '無法取得配額資訊'}</span>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="ml-auto"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // 無配額資訊
  if (!quotaStatus) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        無配額資訊
      </div>
    );
  }

  // 無限制方案
  if (quotaStatus.quota_type === 'none') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Infinity className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">訊息配額</span>
          </div>
          <Badge variant="default" className="bg-green-500">
            無限制
          </Badge>
        </div>
        {!compact && (
          <p className="text-xs text-muted-foreground">
            本月已發送 {quotaStatus.quota_used.toLocaleString()} 則訊息
          </p>
        )}
      </div>
    );
  }

  // 有限制方案
  const {
    quota_limit,
    quota_used,
    quota_remaining,
    usage_percentage,
    is_near_limit,
    is_exceeded
  } = quotaStatus;

  // 決定進度條顏色
  const getProgressColor = () => {
    if (is_exceeded) return 'bg-red-500';
    if (is_near_limit) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  // 決定狀態徽章
  const getStatusBadge = () => {
    if (is_exceeded) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          已用盡
        </Badge>
      );
    }
    if (is_near_limit) {
      return (
        <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          接近上限
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        正常
      </Badge>
    );
  };

  if (compact) {
    // 緊湊模式：單行顯示
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">訊息配額</span>
          </div>
          {getStatusBadge()}
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {quota_used?.toLocaleString()} / {quota_limit?.toLocaleString()}
            </span>
            <span>{usage_percentage}%</span>
          </div>
          <Progress 
            value={usage_percentage} 
            className="h-2"
            indicatorClassName={getProgressColor()}
          />
        </div>

        {is_exceeded && (
          <p className="text-xs text-red-600 dark:text-red-400">
            ⚠️ 配額已用盡，無法發送更多訊息
          </p>
        )}
        {is_near_limit && !is_exceeded && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            ⚠️ 配額即將用盡，剩餘 {quota_remaining?.toLocaleString()} 則
          </p>
        )}
      </div>
    );
  }

  // 完整模式：詳細顯示
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            訊息配額
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 配額統計 */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground mb-1">已使用</p>
            <p className="text-lg font-bold">{quota_used?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">剩餘</p>
            <p className={`text-lg font-bold ${is_near_limit ? 'text-yellow-600' : 'text-green-600'}`}>
              {quota_remaining?.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">總配額</p>
            <p className="text-lg font-bold">{quota_limit?.toLocaleString()}</p>
          </div>
        </div>

        {/* 進度條 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">使用率</span>
            <span className="font-semibold">{usage_percentage}%</span>
          </div>
          <Progress 
            value={usage_percentage} 
            className="h-3"
            indicatorClassName={getProgressColor()}
          />
        </div>

        {/* 警告訊息 */}
        {is_exceeded && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="text-xs text-red-600 dark:text-red-400">
                <p className="font-semibold mb-1">配額已用盡</p>
                <p>本月訊息配額已達上限，無法發送更多訊息。請升級方案或等待下月重置。</p>
              </div>
            </div>
          </div>
        )}
        {is_near_limit && !is_exceeded && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                <p className="font-semibold mb-1">配額即將用盡</p>
                <p>剩餘 {quota_remaining?.toLocaleString()} 則訊息，請注意發送量。</p>
              </div>
            </div>
          </div>
        )}

        {/* 最後更新時間 */}
        <p className="text-xs text-muted-foreground text-right">
          最後更新：{new Date(quotaStatus.last_updated).toLocaleString('zh-TW')}
        </p>
      </CardContent>
    </Card>
  );
}

