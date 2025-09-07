"""
WebSocket 連接管理器
提供即時數據更新功能
"""
import asyncio
import json
import logging
from typing import Dict, Set, List, Optional
from fastapi import WebSocket
from datetime import datetime

logger = logging.getLogger(__name__)

class WebSocketManager:
    """WebSocket 連接管理器"""
    
    def __init__(self):
        # Bot 連接管理
        self.bot_connections: Dict[str, Set[WebSocket]] = {}
        # 用戶儀表板連接
        self.dashboard_connections: Dict[str, Set[WebSocket]] = {}
        # 訂閱管理
        self.analytics_subscribers: Dict[str, Set[WebSocket]] = {}
        self.activity_subscribers: Dict[str, Set[WebSocket]] = {}
        self.webhook_subscribers: Dict[str, Set[WebSocket]] = {}
        # 消息去重管理
        self.sent_messages: Dict[str, Set[str]] = {}  # bot_id -> set of line_message_ids
        self.message_cache_size = 1000  # 每個 Bot 最多快取 1000 個訊息 ID
        
    async def connect(self, bot_id: str, websocket: WebSocket):
        """註冊 Bot WebSocket 連接"""
        if bot_id not in self.bot_connections:
            self.bot_connections[bot_id] = set()
        
        self.bot_connections[bot_id].add(websocket)
        logger.info(f"Bot {bot_id} WebSocket 連接已建立，當前連接數: {len(self.bot_connections[bot_id])}")
        
        # 發送歡迎消息
        await self.send_to_websocket(websocket, {
            'type': 'connected',
            'bot_id': bot_id,
            'timestamp': datetime.now().isoformat(),
            'message': 'WebSocket 連接成功'
        })
    
    async def disconnect(self, bot_id: str, websocket: WebSocket):
        """移除 Bot WebSocket 連接"""
        if bot_id in self.bot_connections:
            self.bot_connections[bot_id].discard(websocket)
            
            # 清理空的連接集合
            if not self.bot_connections[bot_id]:
                del self.bot_connections[bot_id]
                logger.info(f"Bot {bot_id} 所有 WebSocket 連接已清理")
        
        # 清理訂閱
        self._cleanup_subscriptions(bot_id, websocket)
    
    async def connect_user_dashboard(self, user_id: str, websocket: WebSocket):
        """註冊用戶儀表板 WebSocket 連接"""
        if user_id not in self.dashboard_connections:
            self.dashboard_connections[user_id] = set()
        
        self.dashboard_connections[user_id].add(websocket)
        logger.info(f"用戶 {user_id} 儀表板 WebSocket 連接已建立")
        
        await self.send_to_websocket(websocket, {
            'type': 'dashboard_connected',
            'user_id': user_id,
            'timestamp': datetime.now().isoformat()
        })
    
    async def disconnect_user_dashboard(self, user_id: str, websocket: WebSocket):
        """移除用戶儀表板 WebSocket 連接"""
        if user_id in self.dashboard_connections:
            self.dashboard_connections[user_id].discard(websocket)
            
            if not self.dashboard_connections[user_id]:
                del self.dashboard_connections[user_id]
    
    def _cleanup_subscriptions(self, bot_id: str, websocket: WebSocket):
        """清理訂閱"""
        for subscribers in [self.analytics_subscribers, self.activity_subscribers, self.webhook_subscribers]:
            if bot_id in subscribers:
                subscribers[bot_id].discard(websocket)
                if not subscribers[bot_id]:
                    del subscribers[bot_id]
    
    async def broadcast_to_bot(self, bot_id: str, message: dict):
        """向特定 Bot 的所有連接廣播消息"""
        if bot_id not in self.bot_connections:
            return
        
        disconnected = set()
        
        for websocket in self.bot_connections[bot_id].copy():
            try:
                await self.send_to_websocket(websocket, message)
            except Exception as e:
                logger.warning(f"發送消息失敗，移除連接: {e}")
                disconnected.add(websocket)
        
        # 清理斷開的連接
        for websocket in disconnected:
            await self.disconnect(bot_id, websocket)
    
    async def send_analytics_update(self, bot_id: str, analytics_data: dict):
        """發送分析數據更新"""
        message = {
            'type': 'analytics_update',
            'bot_id': bot_id,
            'data': analytics_data,
            'timestamp': datetime.now().isoformat()
        }
        
        await self._send_to_subscribers(bot_id, self.analytics_subscribers, message)
    
    async def send_activity_update(self, bot_id: str, activity_data: dict):
        """發送活動更新"""
        message = {
            'type': 'activity_update',
            'bot_id': bot_id,
            'data': activity_data,
            'timestamp': datetime.now().isoformat()
        }
        
        await self._send_to_subscribers(bot_id, self.activity_subscribers, message)
    
    async def send_webhook_status_update(self, bot_id: str, webhook_data: dict):
        """發送 Webhook 狀態更新"""
        message = {
            'type': 'webhook_status_update',
            'bot_id': bot_id,
            'data': webhook_data,
            'timestamp': datetime.now().isoformat()
        }
        
        await self._send_to_subscribers(bot_id, self.webhook_subscribers, message)
    
    async def send_new_user_message(self, bot_id: str, line_user_id: str, message_data: dict):
        """發送新用戶訊息通知（含去重機制）"""
        line_message_id = message_data.get('line_message_id')

        # 如果有 line_message_id，檢查是否已發送過
        if line_message_id:
            if bot_id not in self.sent_messages:
                self.sent_messages[bot_id] = set()

            if line_message_id in self.sent_messages[bot_id]:
                logger.debug(f"WebSocket 消息已發送過，跳過: {line_message_id}")
                return

            # 記錄已發送的消息 ID
            self.sent_messages[bot_id].add(line_message_id)

            # 限制快取大小，移除最舊的記錄
            if len(self.sent_messages[bot_id]) > self.message_cache_size:
                # 移除一半的舊記錄
                old_messages = list(self.sent_messages[bot_id])[:self.message_cache_size // 2]
                for old_msg_id in old_messages:
                    self.sent_messages[bot_id].discard(old_msg_id)
                logger.debug(f"清理 Bot {bot_id} 的舊消息快取，移除 {len(old_messages)} 條記錄")

        message = {
            'type': 'new_user_message',
            'bot_id': bot_id,
            'line_user_id': line_user_id,
            'data': {
                'line_user_id': line_user_id,
                'message_data': message_data,
                'timestamp': datetime.now().isoformat()
            },
            'timestamp': datetime.now().isoformat()
        }

        # 發送到所有該 Bot 的連接
        await self._send_to_bot_connections(bot_id, message)

        # 也發送到活動訂閱者
        await self._send_to_subscribers(bot_id, self.activity_subscribers, message)

        logger.info(f"WebSocket 新用戶訊息已發送: Bot {bot_id}, User {line_user_id}, Message ID {line_message_id}")
    
    async def _send_to_bot_connections(self, bot_id: str, message: dict):
        """發送消息到 Bot 的所有連接"""
        if bot_id in self.bot_connections:
            websockets_to_remove = []
            
            for websocket in self.bot_connections[bot_id].copy():
                try:
                    await self.send_to_websocket(websocket, message)
                except Exception as e:
                    logger.warning(f"發送消息到 WebSocket 失敗: {e}")
                    websockets_to_remove.append(websocket)
            
            # 清理失效的連接
            for ws in websockets_to_remove:
                self.bot_connections[bot_id].discard(ws)
    
    async def _send_to_subscribers(self, bot_id: str, subscribers_dict: Dict[str, Set[WebSocket]], message: dict):
        """向訂閱者發送消息"""
        if bot_id not in subscribers_dict:
            return
        
        disconnected = set()
        
        for websocket in subscribers_dict[bot_id].copy():
            try:
                await self.send_to_websocket(websocket, message)
            except Exception as e:
                logger.warning(f"發送訂閱消息失敗: {e}")
                disconnected.add(websocket)
        
        # 清理斷開的連接
        for websocket in disconnected:
            subscribers_dict[bot_id].discard(websocket)
    
    async def send_to_websocket(self, websocket: WebSocket, message: dict):
        """安全地發送消息到 WebSocket"""
        try:
            await websocket.send_text(json.dumps(message, ensure_ascii=False))
        except Exception as e:
            logger.error(f"WebSocket 發送失敗: {e}")
            raise
    
    async def subscribe_to_analytics(self, bot_id: str, websocket: WebSocket):
        """訂閱分析數據更新"""
        if bot_id not in self.analytics_subscribers:
            self.analytics_subscribers[bot_id] = set()
        
        self.analytics_subscribers[bot_id].add(websocket)
        logger.info(f"Bot {bot_id} 新增分析數據訂閱")
        
        await self.send_to_websocket(websocket, {
            'type': 'subscribed',
            'subscription': 'analytics',
            'bot_id': bot_id,
            'timestamp': datetime.now().isoformat()
        })
    
    async def subscribe_to_activities(self, bot_id: str, websocket: WebSocket):
        """訂閱活動更新"""
        if bot_id not in self.activity_subscribers:
            self.activity_subscribers[bot_id] = set()
        
        self.activity_subscribers[bot_id].add(websocket)
        logger.info(f"Bot {bot_id} 新增活動訂閱")
        
        await self.send_to_websocket(websocket, {
            'type': 'subscribed',
            'subscription': 'activities',
            'bot_id': bot_id,
            'timestamp': datetime.now().isoformat()
        })
    
    async def subscribe_to_webhook_status(self, bot_id: str, websocket: WebSocket):
        """訂閱 Webhook 狀態更新"""
        if bot_id not in self.webhook_subscribers:
            self.webhook_subscribers[bot_id] = set()
        
        self.webhook_subscribers[bot_id].add(websocket)
        logger.info(f"Bot {bot_id} 新增 Webhook 狀態訂閱")
        
        await self.send_to_websocket(websocket, {
            'type': 'subscribed',
            'subscription': 'webhook_status',
            'bot_id': bot_id,
            'timestamp': datetime.now().isoformat()
        })
    
    def get_connection_stats(self) -> dict:
        """獲取連接統計"""
        return {
            'bot_connections': {bot_id: len(connections) for bot_id, connections in self.bot_connections.items()},
            'dashboard_connections': {user_id: len(connections) for user_id, connections in self.dashboard_connections.items()},
            'total_bot_connections': sum(len(connections) for connections in self.bot_connections.values()),
            'total_dashboard_connections': sum(len(connections) for connections in self.dashboard_connections.values()),
            'analytics_subscribers': {bot_id: len(subs) for bot_id, subs in self.analytics_subscribers.items()},
            'activity_subscribers': {bot_id: len(subs) for bot_id, subs in self.activity_subscribers.items()},
            'webhook_subscribers': {bot_id: len(subs) for bot_id, subs in self.webhook_subscribers.items()},
            'message_cache': {bot_id: len(msgs) for bot_id, msgs in self.sent_messages.items()}
        }

    def clear_message_cache(self, bot_id: str = None):
        """清理消息快取"""
        if bot_id:
            if bot_id in self.sent_messages:
                cleared_count = len(self.sent_messages[bot_id])
                del self.sent_messages[bot_id]
                logger.info(f"已清理 Bot {bot_id} 的消息快取，移除 {cleared_count} 條記錄")
        else:
            total_cleared = sum(len(msgs) for msgs in self.sent_messages.values())
            self.sent_messages.clear()
            logger.info(f"已清理所有消息快取，移除 {total_cleared} 條記錄")

    def get_cache_stats(self) -> dict:
        """獲取快取統計信息"""
        return {
            'total_bots': len(self.sent_messages),
            'total_cached_messages': sum(len(msgs) for msgs in self.sent_messages.values()),
            'cache_by_bot': {bot_id: len(msgs) for bot_id, msgs in self.sent_messages.items()},
            'cache_size_limit': self.message_cache_size
        }

# 全局實例
websocket_manager = WebSocketManager()
