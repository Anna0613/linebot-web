/**
 * WebSocket Hook
 * 提供即時數據更新功能
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { UnifiedAuthManager } from '../services/UnifiedAuthManager';

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

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // 獲取認證 token（使用統一認證管理器）
  const getAuthToken = useCallback(() => {
    console.debug('🔍 開始查找認證 token...');

    try {
      const authManager = UnifiedAuthManager.getInstance();
      const token = authManager.getAccessToken();
      
      if (token) {
        console.debug('✅ 從 UnifiedAuthManager 找到 token');
        return token;
      }

      console.warn('❌ UnifiedAuthManager 中未找到認證 token');
      return null;
    } catch (error) {
      console.error('從 UnifiedAuthManager 獲取 token 失敗:', error);
      return null;
    }
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
  }, []);

  // 發送消息
  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current) {
      const readyState = wsRef.current.readyState;
      const readyStateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
      
      if (readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
        console.debug('發送 WebSocket 消息:', message);
        return true;
      } else {
        console.warn(`WebSocket 未連接，當前狀態: ${readyStateNames[readyState] || readyState}，無法發送消息:`, message);
        return false;
      }
    } else {
      console.warn('WebSocket 實例不存在，無法發送消息:', message);
      return false;
    }
  }, []);

  // 停止心跳
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
  }, []);

  // 啟動心跳
  const startHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const success = sendMessage({ 
          type: 'ping',
          timestamp: new Date().toISOString()
        });
        if (!success) {
          console.warn('心跳發送失敗，WebSocket 可能已斷開');
        }
      } else {
        console.debug('跳過心跳發送，WebSocket 未連接');
      }
    }, 30000); // 每 30 秒發送心跳
  }, [sendMessage]);

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

        // 訂閱數據更新 - 使用重試機制確保發送成功
        if (botId) {
          const sendSubscriptions = (retries = 3) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              console.log('準備發送 WebSocket 訂閱消息...');
              
              const subscriptions = [
                { type: 'subscribe_analytics' },
                { type: 'subscribe_activities' },
                { type: 'subscribe_webhook_status' },
                { type: 'get_initial_data' }
              ];
              
              let successCount = 0;
              subscriptions.forEach((subscription) => {
                const success = sendMessage(subscription);
                if (success) {
                  successCount++;
                  console.log(`✅ 已發送: ${subscription.type}`);
                } else {
                  console.error(`❌ 發送失敗: ${subscription.type}`);
                }
              });
              
              console.log(`WebSocket 訂閱完成: ${successCount}/${subscriptions.length} 成功`);
            } else if (retries > 0) {
              console.log(`WebSocket 尚未就緒，${retries} 次重試後再嘗試...`);
              setTimeout(() => sendSubscriptions(retries - 1), 300);
            } else {
              console.error('WebSocket 訂閱失敗：連接未建立');
              setConnectionError('訂閱失敗：連接未建立');
            }
          };
          
          // 延遲後發送訂閱
          setTimeout(() => sendSubscriptions(), 100);
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
  }, [getWebSocketUrl, handleMessage, autoReconnect, maxReconnectAttempts, reconnectInterval, enabled, sendMessage, startHeartbeat, botId, stopHeartbeat]);

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
  }, [stopHeartbeat]);

  // 手動重連
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 1000);
  }, [disconnect, connect]);

  // 組件掛載時連接 - 延遲連接以確保認證狀態穩定
  useEffect(() => {
    if ((botId || userId) && enabled) {
      // 延遲連接，讓頁面先完成初始化
      const delayTimer = setTimeout(() => {
        connect();
      }, 1000); // 延遲 1 秒

      return () => {
        clearTimeout(delayTimer);
        disconnect();
      };
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
