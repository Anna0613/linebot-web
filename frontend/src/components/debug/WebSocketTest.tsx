/**
 * WebSocket 測試組件
 * 用於調試和驗證 WebSocket 功能
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useIncrementalUpdate } from '@/hooks/useIncrementalUpdate';

interface WebSocketTestProps {
  botId?: string;
  userId?: string;
}

export const WebSocketTest: React.FC<WebSocketTestProps> = ({ botId, userId }) => {
  const [testBotId, setTestBotId] = useState(botId || '');
  const [testUserId, setTestUserId] = useState(userId || '');
  const [messages, setMessages] = useState<any[]>([]);
  const [customMessage, setCustomMessage] = useState('');

  // WebSocket Hook
  const { 
    isConnected, 
    connectionError, 
    lastMessage, 
    sendMessage, 
    connect, 
    disconnect, 
    reconnect 
  } = useWebSocket({
    botId: testBotId || undefined,
    userId: testUserId || undefined,
    autoReconnect: true,
    enabled: !!(testBotId || testUserId)
  });

  // 增量更新 Hook
  const {
    updateAnalyticsIncremental,
    updateWebhookStatusSmart,
    updateActivitiesIncremental,
    batchIncrementalUpdate,
    forceUpdate
  } = useIncrementalUpdate({
    botId: testBotId || undefined
  });

  // 記錄收到的消息
  React.useEffect(() => {
    if (lastMessage) {
      setMessages(prev => [
        {
          ...lastMessage,
          receivedAt: new Date().toISOString()
        },
        ...prev.slice(0, 49) // 保持最新 50 條
      ]);
    }
  }, [lastMessage]);

  const handleConnect = () => {
    if (testBotId || testUserId) {
      connect();
    }
  };

  const handleSendCustomMessage = () => {
    if (customMessage.trim()) {
      try {
        const message = JSON.parse(customMessage);
        sendMessage(message);
        setCustomMessage('');
      } catch (error) {
        alert('無效的 JSON 格式');
      }
    }
  };

  const handleSendPredefinedMessage = (type: string) => {
    const messages = {
      ping: { type: 'ping', timestamp: new Date().toISOString() },
      subscribe_analytics: { type: 'subscribe_analytics' },
      subscribe_activities: { type: 'subscribe_activities' },
      subscribe_webhook_status: { type: 'subscribe_webhook_status' },
      get_initial_data: { type: 'get_initial_data' }
    };

    const message = messages[type as keyof typeof messages];
    if (message) {
      sendMessage(message);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>WebSocket 連接測試</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 連接配置 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Bot ID</label>
              <Input
                value={testBotId}
                onChange={(e) => setTestBotId(e.target.value)}
                placeholder="輸入 Bot ID"
              />
            </div>
            <div>
              <label className="text-sm font-medium">User ID</label>
              <Input
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                placeholder="輸入 User ID"
              />
            </div>
          </div>

          {/* 連接狀態 */}
          <div className="flex items-center gap-4">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "已連接" : "未連接"}
            </Badge>
            {connectionError && (
              <span className="text-red-500 text-sm">{connectionError}</span>
            )}
          </div>

          {/* 連接控制 */}
          <div className="flex gap-2">
            <Button onClick={handleConnect} disabled={isConnected}>
              連接
            </Button>
            <Button onClick={disconnect} disabled={!isConnected} variant="outline">
              斷開
            </Button>
            <Button onClick={reconnect} variant="outline">
              重連
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 消息發送 */}
      <Card>
        <CardHeader>
          <CardTitle>發送消息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 預定義消息 */}
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleSendPredefinedMessage('ping')}
              disabled={!isConnected}
            >
              Ping
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleSendPredefinedMessage('subscribe_analytics')}
              disabled={!isConnected}
            >
              訂閱分析
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleSendPredefinedMessage('subscribe_activities')}
              disabled={!isConnected}
            >
              訂閱活動
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleSendPredefinedMessage('subscribe_webhook_status')}
              disabled={!isConnected}
            >
              訂閱 Webhook
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleSendPredefinedMessage('get_initial_data')}
              disabled={!isConnected}
            >
              獲取初始數據
            </Button>
          </div>

          {/* 自定義消息 */}
          <div className="flex gap-2">
            <Input
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder='輸入 JSON 消息，例如: {"type": "ping"}'
              className="flex-1"
            />
            <Button 
              onClick={handleSendCustomMessage}
              disabled={!isConnected || !customMessage.trim()}
            >
              發送
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 增量更新測試 */}
      <Card>
        <CardHeader>
          <CardTitle>增量更新測試</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => updateAnalyticsIncremental()}
              disabled={!testBotId}
            >
              更新分析數據
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => updateWebhookStatusSmart()}
              disabled={!testBotId}
            >
              檢查 Webhook 狀態
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => updateActivitiesIncremental()}
              disabled={!testBotId}
            >
              更新活動列表
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => batchIncrementalUpdate()}
              disabled={!testBotId}
            >
              批次更新
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => forceUpdate('all')}
              disabled={!testBotId}
            >
              強制更新全部
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 消息日誌 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>消息日誌 ({messages.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={clearMessages}>
            清空
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  暫無消息
                </p>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline">{message.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.receivedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(message, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
