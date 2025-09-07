/**
 * 全域 WebSocket 管理器
 * 解決多重連接問題，確保每個 Bot 只有一個 WebSocket 連接
 */

import { authManager } from './UnifiedAuthManager';

interface WebSocketMessage {
  type: string;
  bot_id?: string;
  data?: any;
  timestamp?: string;
  [key: string]: any;
}

interface WebSocketSubscriber {
  id: string;
  callback: (message: WebSocketMessage) => void;
}

interface WebSocketConnection {
  socket: WebSocket;
  subscribers: Set<WebSocketSubscriber>;
  isConnecting: boolean;
  reconnectAttempts: number;
  heartbeatInterval?: NodeJS.Timeout;
}

class WebSocketManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1 秒
  private heartbeatInterval = 30000; // 30 秒

  /**
   * 訂閱 Bot 的 WebSocket 消息
   */
  subscribe(
    botId: string, 
    callback: (message: WebSocketMessage) => void,
    subscriberId?: string
  ): () => void {
    const id = subscriberId || `subscriber_${Date.now()}_${Math.random()}`;
    
    // 確保連接存在
    this.ensureConnection(botId);
    
    const connection = this.connections.get(botId);
    if (!connection) {
      console.error(`無法為 Bot ${botId} 創建連接`);
      return () => {};
    }

    // 添加訂閱者
    const subscriber: WebSocketSubscriber = { id, callback };
    connection.subscribers.add(subscriber);
    
    console.log(`✅ 已訂閱 Bot ${botId} 的 WebSocket 消息，訂閱者 ID: ${id}`);

    // 返回取消訂閱函數
    return () => {
      connection.subscribers.delete(subscriber);
      console.log(`❌ 已取消訂閱 Bot ${botId} 的 WebSocket 消息，訂閱者 ID: ${id}`);
      
      // 如果沒有訂閱者了，關閉連接
      if (connection.subscribers.size === 0) {
        this.disconnect(botId);
      }
    };
  }

  /**
   * 確保 Bot 的 WebSocket 連接存在
   */
  private ensureConnection(botId: string): void {
    if (this.connections.has(botId)) {
      const connection = this.connections.get(botId)!;
      if (connection.socket.readyState === WebSocket.OPEN) {
        return; // 連接已存在且正常
      }
    }

    // 創建新連接
    this.createConnection(botId);
  }

  /**
   * 創建 WebSocket 連接
   */
  private createConnection(botId: string): void {
    if (this.connections.has(botId)) {
      const existing = this.connections.get(botId)!;
      if (existing.isConnecting) {
        console.log(`Bot ${botId} 正在連接中，跳過重複創建`);
        return;
      }
    }

    console.log(`🔗 為 Bot ${botId} 創建 WebSocket 連接`);

    const connection: WebSocketConnection = {
      socket: null as any,
      subscribers: new Set(),
      isConnecting: true,
      reconnectAttempts: 0
    };

    this.connections.set(botId, connection);

    try {
      const token = this.getAuthToken();
      const url = this.getWebSocketUrl(botId, token);
      
      connection.socket = new WebSocket(url);
      
      connection.socket.onopen = () => {
        console.log(`✅ Bot ${botId} WebSocket 連接已建立`);
        connection.isConnecting = false;
        connection.reconnectAttempts = 0;
        
        // 發送訂閱消息
        this.sendSubscriptions(connection.socket);
        
        // 啟動心跳
        this.startHeartbeat(botId);
      };

      connection.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log(`📨 收到 Bot ${botId} WebSocket 消息:`, message.type);
          
          // 廣播給所有訂閱者
          connection.subscribers.forEach(subscriber => {
            try {
              subscriber.callback(message);
            } catch (error) {
              console.error(`訂閱者 ${subscriber.id} 處理消息失敗:`, error);
            }
          });
        } catch (error) {
          console.error(`解析 WebSocket 消息失敗:`, error);
        }
      };

      connection.socket.onclose = () => {
        console.log(`❌ Bot ${botId} WebSocket 連接已關閉`);
        connection.isConnecting = false;
        this.stopHeartbeat(botId);
        
        // 如果還有訂閱者，嘗試重連
        if (connection.subscribers.size > 0) {
          this.scheduleReconnect(botId);
        }
      };

      connection.socket.onerror = (error) => {
        console.error(`❌ Bot ${botId} WebSocket 連接錯誤:`, error);
        connection.isConnecting = false;
      };

    } catch (error) {
      console.error(`創建 WebSocket 連接失敗:`, error);
      connection.isConnecting = false;
    }
  }

  /**
   * 發送訂閱消息
   */
  private sendSubscriptions(socket: WebSocket): void {
    if (socket.readyState !== WebSocket.OPEN) return;

    const subscriptions = [
      { type: 'subscribe_analytics' },
      { type: 'subscribe_activities' },
      { type: 'subscribe_webhook_status' },
      { type: 'get_initial_data' }
    ];

    subscriptions.forEach(subscription => {
      try {
        socket.send(JSON.stringify(subscription));
        console.log(`✅ 已發送訂閱: ${subscription.type}`);
      } catch (error) {
        console.error(`發送訂閱失敗: ${subscription.type}`, error);
      }
    });
  }

  /**
   * 啟動心跳
   */
  private startHeartbeat(botId: string): void {
    const connection = this.connections.get(botId);
    if (!connection) return;

    connection.heartbeatInterval = setInterval(() => {
      if (connection.socket.readyState === WebSocket.OPEN) {
        try {
          connection.socket.send(JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error(`發送心跳失敗:`, error);
        }
      }
    }, this.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(botId: string): void {
    const connection = this.connections.get(botId);
    if (connection?.heartbeatInterval) {
      clearInterval(connection.heartbeatInterval);
      connection.heartbeatInterval = undefined;
    }
  }

  /**
   * 安排重連
   */
  private scheduleReconnect(botId: string): void {
    const connection = this.connections.get(botId);
    if (!connection) return;

    if (connection.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Bot ${botId} 重連次數已達上限，停止重連`);
      return;
    }

    connection.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, connection.reconnectAttempts - 1);
    
    console.log(`🔄 Bot ${botId} 將在 ${delay}ms 後重連 (第 ${connection.reconnectAttempts} 次)`);
    
    setTimeout(() => {
      if (connection.subscribers.size > 0) {
        this.createConnection(botId);
      }
    }, delay);
  }

  /**
   * 斷開連接
   */
  private disconnect(botId: string): void {
    const connection = this.connections.get(botId);
    if (!connection) return;

    console.log(`🔌 斷開 Bot ${botId} 的 WebSocket 連接`);
    
    this.stopHeartbeat(botId);
    
    if (connection.socket) {
      connection.socket.close();
    }
    
    this.connections.delete(botId);
  }

  /**
   * 獲取認證 Token
   */
  private getAuthToken(): string {
    try {
      // 使用 UnifiedAuthManager 獲取 token
      const token = authManager.getAccessToken();

      if (token) {
        console.debug('✅ 從 UnifiedAuthManager 獲取到 token');
        return token;
      }

      console.warn('❌ UnifiedAuthManager 中未找到認證 token');
      return '';
    } catch (error) {
      console.error('從 UnifiedAuthManager 獲取 token 失敗:', error);

      // 備用方案：嘗試從 localStorage 獲取
      const fallbackToken = localStorage.getItem('auth_token') || '';
      if (fallbackToken) {
        console.debug('✅ 使用備用 token');
      }
      return fallbackToken;
    }
  }

  /**
   * 獲取 WebSocket URL
   */
  private getWebSocketUrl(botId: string, token: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.hostname === 'localhost' ? ':8000' : '';
    
    return `${protocol}//${host}${port}/api/v1/ws/bot/${botId}?token=${token}`;
  }

  /**
   * 獲取連接狀態
   */
  getConnectionState(botId: string): number | null {
    const connection = this.connections.get(botId);
    return connection?.socket?.readyState ?? null;
  }

  /**
   * 檢查是否已連接
   */
  isConnected(botId: string): boolean {
    return this.getConnectionState(botId) === WebSocket.OPEN;
  }

  /**
   * 清理所有連接
   */
  cleanup(): void {
    console.log('🧹 清理所有 WebSocket 連接');
    this.connections.forEach((_, botId) => {
      this.disconnect(botId);
    });
    this.connections.clear();
  }
}

// 創建全域實例
export const webSocketManager = new WebSocketManager();

// 在頁面卸載時清理連接
window.addEventListener('beforeunload', () => {
  webSocketManager.cleanup();
});

export default webSocketManager;
