import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Globe, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Copy, 
  RefreshCw, 
  Link,
  Clock,
  Activity,
  ExternalLink
} from 'lucide-react';

interface WebhookStatus {
  bot_id: string;
  bot_name: string;
  status: 'active' | 'inactive' | 'configuration_error' | 'not_configured';
  status_text: string;
  is_configured: boolean;
  line_api_accessible: boolean;
  webhook_working: boolean;
  webhook_url: string;
  webhook_endpoint_info?: {
    is_set: boolean;
    endpoint?: string;
    active: boolean;
    error?: string;
  };
  checked_at: string;
  error?: string;
}

interface WebhookStatusPanelProps {
  status: WebhookStatus;
  onRefresh: () => void;
  onCopyUrl: () => void;
  isRefreshing?: boolean;
  urlCopied?: boolean;
}

const WebhookStatusPanel: React.FC<WebhookStatusPanelProps> = ({
  status,
  onRefresh,
  onCopyUrl,
  isRefreshing = false,
  urlCopied = false
}) => {
  // 狀態圖示和顏色映射
  const getStatusConfig = (statusType: string) => {
    switch (statusType) {
      case 'active':
        return { 
          icon: CheckCircle, 
          color: 'text-green-600', 
          bgColor: 'bg-green-50 border-green-200',
          variant: 'default' as const
        };
      case 'inactive':
        return { 
          icon: XCircle, 
          color: 'text-red-600', 
          bgColor: 'bg-red-50 border-red-200',
          variant: 'destructive' as const
        };
      case 'configuration_error':
        return { 
          icon: AlertCircle, 
          color: 'text-orange-600', 
          bgColor: 'bg-orange-50 border-orange-200',
          variant: 'secondary' as const
        };
      default:
        return { 
          icon: AlertCircle, 
          color: 'text-gray-600', 
          bgColor: 'bg-gray-50 border-gray-200',
          variant: 'outline' as const
        };
    }
  };

  const statusConfig = getStatusConfig(status.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* 主要狀態卡片 */}
      <Card className={`border-2 ${statusConfig.bgColor}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
              <span>Webhook 狀態</span>
              <Badge variant={statusConfig.variant}>
                {status.status_text}
              </Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? '檢查中...' : '重新檢查'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 錯誤訊息 */}
          {status.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <div className="font-medium mb-1">發生錯誤</div>
                  <div>{status.error}</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* LINE API 連接狀態 */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className={`p-2 rounded-full ${status.line_api_accessible ? 'bg-green-100' : 'bg-red-100'}`}>
                <Globe className={`h-4 w-4 ${status.line_api_accessible ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <div className="font-medium text-sm">LINE API</div>
                <div className={`text-xs ${status.line_api_accessible ? 'text-green-600' : 'text-red-600'}`}>
                  {status.line_api_accessible ? '連接正常' : '連接失敗'}
                </div>
              </div>
            </div>

            {/* Bot 配置狀態 */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className={`p-2 rounded-full ${status.is_configured ? 'bg-green-100' : 'bg-yellow-100'}`}>
                <Activity className={`h-4 w-4 ${status.is_configured ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
              <div>
                <div className="font-medium text-sm">Bot 配置</div>
                <div className={`text-xs ${status.is_configured ? 'text-green-600' : 'text-yellow-600'}`}>
                  {status.is_configured ? '已完成' : '未完成'}
                </div>
              </div>
            </div>

            {/* Webhook 工作狀態 */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className={`p-2 rounded-full ${status.webhook_working ? 'bg-green-100' : 'bg-red-100'}`}>
                <Link className={`h-4 w-4 ${status.webhook_working ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <div className="font-medium text-sm">Webhook</div>
                <div className={`text-xs ${status.webhook_working ? 'text-green-600' : 'text-red-600'}`}>
                  {status.webhook_working ? '正常運作' : '未運作'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook URL 管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Webhook URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-mono break-all">
                {status.webhook_url}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                將此 URL 設定到 LINE Developers Console
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onCopyUrl}
                >
                  {urlCopied ? (
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {urlCopied ? '已複製' : '複製 URL'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  asChild
                >
                  <a 
                    href="https://developers.line.biz/console/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    LINE Console
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook 端點資訊 */}
      {status.webhook_endpoint_info && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              端點詳細資訊
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">端點狀態</span>
                <Badge variant={status.webhook_endpoint_info.is_set ? "default" : "secondary"}>
                  {status.webhook_endpoint_info.is_set ? '已設定' : '未設定'}
                </Badge>
              </div>

              {status.webhook_endpoint_info.endpoint && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">端點地址</span>
                  <span className="text-sm font-mono text-muted-foreground">
                    {status.webhook_endpoint_info.endpoint}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">激活狀態</span>
                <Badge variant={status.webhook_endpoint_info.active ? "default" : "secondary"}>
                  {status.webhook_endpoint_info.active ? '已激活' : '未激活'}
                </Badge>
              </div>

              {status.webhook_endpoint_info.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm text-red-800">
                    <div className="font-medium mb-1">端點錯誤</div>
                    <div>{status.webhook_endpoint_info.error}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 最後檢查時間 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            最後檢查時間：{new Date(status.checked_at).toLocaleString('zh-TW')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookStatusPanel;