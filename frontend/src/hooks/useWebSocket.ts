/**
 * WebSocket Hook - 重構版本
 * 使用全域 WebSocket 管理器，避免重複連接
 */
import { useEffect, useState, useCallback } from 'react';
import { webSocketManager } from '../services/WebSocketManager';
import { useOptimizedWebSocketCheck } from './useOptimizedPolling';

interface WebSocketMessage {
  type: string;
  bot_id?: string;
  user_id?: string;
  data?: unknown;
  timestamp?: string;
  message?: string;
  subscription?: string;
}

interface UseWebSocketOptions {
  botId?: string;
  userId?: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  enabled?: boolean;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    botId,
    enabled = true
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // 檢查連接狀態
  const checkConnectionState = useCallback(() => {
    if (!botId) return;

    const state = webSocketManager.getConnectionState(botId);
    const connected = state === WebSocket.OPEN;

    setIsConnected(connected);
    if (!connected && state !== null) {
      setConnectionError('連接已斷開');
    } else if (connected) {
      setConnectionError(null);
    }
  }, [botId]);

  // 處理 WebSocket 消息
  const handleMessage = useCallback((message: WebSocketMessage) => {
    setLastMessage(message);

    // 處理連接狀態消息
    switch (message.type) {
      case 'connected':
        console.log('WebSocket 連接成功:', message.message);
        setIsConnected(true);
        setConnectionError(null);
        break;

      case 'subscribed':
        console.log(`已訂閱 ${message.subscription}: Bot ${message.bot_id}`);
        break;

      case 'initial_data':
        console.log('收到初始數據:', message.data);
        break;

      case 'error':
        console.error('WebSocket 錯誤:', message.message);
        setConnectionError(message.message || 'WebSocket 錯誤');
        break;

      default:
        console.debug(`收到 WebSocket 消息: ${message.type}`);
    }
  }, []);

  // 使用優化的 WebSocket 狀態檢查
  useOptimizedWebSocketCheck(
    checkConnectionState,
    () => isConnected
  );

  // 使用全域管理器訂閱 WebSocket 消息
  useEffect(() => {
    if (!botId || !enabled) {
      return;
    }

    console.log(`🔗 訂閱 Bot ${botId} 的 WebSocket 消息`);

    // 訂閱消息
    const unsubscribe = webSocketManager.subscribe(botId, handleMessage);

    // 初始檢查
    checkConnectionState();

    return () => {
      console.log(`🔌 取消訂閱 Bot ${botId} 的 WebSocket 消息`);
      unsubscribe();
    };
  }, [botId, enabled, handleMessage, checkConnectionState]);

  // 手動重連（通過全域管理器）
  const reconnect = useCallback(() => {
    if (!botId) return;

    console.log(`🔄 手動重連 Bot ${botId}`);
    // 全域管理器會自動處理重連邏輯
    checkConnectionState();
  }, [botId, checkConnectionState]);

  return {
    isConnected,
    connectionError,
    lastMessage,
    reconnect
  };
};
