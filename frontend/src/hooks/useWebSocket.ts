/**
 * WebSocket Hook
 * 提供即時數據更新功能
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './useReactQuery';

interface WebSocketMessage {
  type: string;
  bot_id?: string;
  user_id?: string;
  data?: any;
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
    userId,
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 3000,
    enabled = true
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const queryClient = useQueryClient();

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // 獲取認證 token（支持多種存儲方式）
  const getAuthToken = useCallback(() => {
    console.debug('🔍 開始查找認證 token...');

    // 方法 1: 嘗試從 localStorage 獲取（舊系統）
    let token = localStorage.getItem('token');
    if (token) {
      console.debug('✅ 從 localStorage[token] 找到 token');
      return token;
    }

    // 方法 2: 嘗試從 localStorage 獲取（舊系統的另一個 key）
    token = localStorage.getItem('auth_token');
    if (token) {
      console.debug('✅ 從 localStorage[auth_token] 找到 token');
      return token;
    }

    // 方法 3: 嘗試從 cookies 獲取（新系統）
    try {
      console.debug('🍪 檢查 cookies:', document.cookie);
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if ((name === 'auth_token' || name === 'auth_token_remember' || name === 'token') && value) {
          console.debug(`✅ 從 cookie[${name}] 找到 token`);
          return decodeURIComponent(value);
        }
      }
    } catch (error) {
      console.warn('從 cookies 獲取 token 失敗:', error);
    }

    console.warn('❌ 未找到任何認證 token');
    console.debug('檢查項目：');
    console.debug('- localStorage.token:', !!localStorage.getItem('token'));
    console.debug('- localStorage.auth_token:', !!localStorage.getItem('auth_token'));
    console.debug('- document.cookie:', document.cookie);

    return null;
  }, []);

  // 獲取 WebSocket URL（包含認證 token）
  const getWebSocketUrl = useCallback(() => {
    const baseUrl = import.meta.env.VITE_UNIFIED_API_URL?.replace('http', 'ws') || 'ws://localhost:8000';

    const token = getAuthToken();
    if (!token) {
      throw new Error('未找到認證 token，請先登入');
    }

    const params = new URLSearchParams({ token });

    if (botId) {
      return `${baseUrl}/api/v1/ws/bot/${botId}?${params.toString()}`;
    } else if (userId) {
      return `${baseUrl}/api/v1/ws/dashboard/${userId}?${params.toString()}`;
    }

    throw new Error('需要提供 botId 或 userId');
  }, [botId, userId, getAuthToken]);

  // 處理 WebSocket 消息
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      setLastMessage(message);
      
      console.log('收到 WebSocket 消息:', message);
      
      // 不在這裡處理具體的數據更新，只是記錄和傳遞消息
      // 具體的數據更新邏輯由使用該 hook 的組件來處理
      console.log(`WebSocket 消息類型: ${message.type}, Bot ID: ${message.bot_id}`);
      
      // 處理特殊的連接狀態消息
      switch (message.type) {
        case 'connected':
          console.log('WebSocket 連接成功:', message.message);
          setIsConnected(true);
          setConnectionError(null);
          reconnectAttemptsRef.current = 0;
          break;

        case 'subscribed':
          console.log(`已訂閱 ${message.subscription}: Bot ${message.bot_id}`);
          break;

        case 'initial_data':
          console.log('收到初始數據:', message.data);
          break;

        case 'pong':
          // 心跳回應
          console.debug('收到心跳回應');
          break;

        case 'error':
          console.error('WebSocket 錯誤:', message.message);
          setConnectionError(message.message || 'WebSocket 錯誤');
          break;

        default:
          console.log('未處理的 WebSocket 消息:', message);
      }
    } catch (error) {
      console.error('解析 WebSocket 消息失敗:', error);
      setConnectionError('消息解析失敗');
    }
  }, [botId]);

  // 連接 WebSocket
  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const url = getWebSocketUrl();
      console.log('嘗試連接 WebSocket:', url);

      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('WebSocket 連接已建立');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;

        // 訂閱數據更新
        if (botId) {
          setTimeout(() => {
            sendMessage({ type: 'subscribe_analytics' });
            sendMessage({ type: 'subscribe_activities' });
            sendMessage({ type: 'subscribe_webhook_status' });
            sendMessage({ type: 'get_initial_data' });
          }, 100);
        }

        // 啟動心跳
        startHeartbeat();
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onclose = (event) => {
        console.log('WebSocket 連接關閉:', event.code, event.reason);
        setIsConnected(false);
        stopHeartbeat();

        // 處理特定的錯誤代碼
        if (event.code === 4001) {
          setConnectionError('認證失敗，請重新登入');
          return; // 認證失敗不進行重連
        } else if (event.code === 4004) {
          setConnectionError('Bot 不存在或無權限訪問');
          return; // 權限問題不進行重連
        }

        // 自動重連
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`嘗試重連 (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionError('達到最大重連次數，連接失敗');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket 錯誤:', error);
        setConnectionError('WebSocket 連接錯誤');
      };

    } catch (error) {
      console.error('建立 WebSocket 連接失敗:', error);
      if (error instanceof Error) {
        if (error.message.includes('認證 token')) {
          setConnectionError('請先登入後再嘗試連接');
          console.warn('WebSocket 連接失敗：未找到有效的認證 token');
          console.info('請檢查：1. 是否已登入 2. token 是否過期 3. 瀏覽器是否清除了 cookies');
        } else {
          setConnectionError(`連接失敗: ${error.message}`);
        }
      } else {
        setConnectionError('無法建立 WebSocket 連接');
      }
    }
  }, [getWebSocketUrl, handleMessage, autoReconnect, maxReconnectAttempts, reconnectInterval, botId, enabled]);

  // 斷開連接
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // 發送消息
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      console.debug('發送 WebSocket 消息:', message);
    } else {
      console.warn('WebSocket 未連接，無法發送消息:', message);
    }
  }, []);

  // 啟動心跳
  const startHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      sendMessage({ 
        type: 'ping',
        timestamp: new Date().toISOString()
      });
    }, 30000); // 每 30 秒發送心跳
  }, [sendMessage]);

  // 停止心跳
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
  }, []);

  // 手動重連
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 1000);
  }, [disconnect, connect]);

  // 組件掛載時連接
  useEffect(() => {
    if ((botId || userId) && enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [botId, userId, enabled, connect, disconnect]);

  return {
    isConnected,
    connectionError,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    reconnect
  };
};
