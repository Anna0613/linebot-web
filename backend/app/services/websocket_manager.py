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
        # 統一訂閱管理 - 每個 Bot 連接可以訂閱多種類型的更新
        self.bot_subscribers: Dict[str, Dict[str, Set[WebSocket]]] = {}  # bot_id -> {subscription_type -> websockets}
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
    
    def _cleanup_subscriptions(self, bot_id: str, websocket: WebSocket):
        """清理訂閱"""
        if bot_id in self.bot_subscribers:
            for subscription_type, subscribers in self.bot_subscribers[bot_id].items():
                subscribers.discard(websocket)

            # 移除空的訂閱類型
            self.bot_subscribers[bot_id] = {
                sub_type: subs for sub_type, subs in self.bot_subscribers[bot_id].items()
                if subs
            }

            # 如果沒有任何訂閱了，移除整個 bot_id
            if not self.bot_subscribers[bot_id]:
                del self.bot_subscribers[bot_id]
    
    async def broadcast_to_bot(self, bot_id: str, message: dict):
        """向特定 Bot 的所有連接廣播消息"""
        logger.info(f"🔄 嘗試廣播訊息到 Bot {bot_id}, 訊息類型: {message.get('type', 'unknown')}")

        if bot_id not in self.bot_connections:
            logger.warning(f"❌ Bot {bot_id} 沒有 WebSocket 連接，無法廣播訊息")
            logger.info(f"📊 當前連接的 Bot: {list(self.bot_connections.keys())}")
            return

        connection_count = len(self.bot_connections[bot_id])
        logger.info(f"📡 Bot {bot_id} 有 {connection_count} 個 WebSocket 連接")

        disconnected = set()

        for websocket in self.bot_connections[bot_id].copy():
            try:
                await self.send_to_websocket(websocket, message)
                logger.debug(f"✅ 成功發送訊息到 WebSocket 連接")
            except Exception as e:
                logger.warning(f"❌ 發送消息失敗，移除連接: {e}")
                disconnected.add(websocket)

        # 清理斷開的連接
        for websocket in disconnected:
            await self.disconnect(bot_id, websocket)

        if disconnected:
            logger.info(f"🧹 清理了 {len(disconnected)} 個斷開的連接")
    
    async def send_analytics_update(self, bot_id: str, analytics_data: dict):
        """發送分析數據更新"""
        message = {
            'type': 'analytics_update',
            'bot_id': bot_id,
            'data': analytics_data,
            'timestamp': datetime.now().isoformat()
        }

        await self._send_to_subscription_type(bot_id, 'analytics', message)

    async def send_activity_update(self, bot_id: str, activity_data: dict):
        """發送活動更新"""
        message = {
            'type': 'activity_update',
            'bot_id': bot_id,
            'data': activity_data,
            'timestamp': datetime.now().isoformat()
        }

        await self._send_to_subscription_type(bot_id, 'activities', message)

    async def send_webhook_status_update(self, bot_id: str, webhook_data: dict):
        """發送 Webhook 狀態更新"""
        message = {
            'type': 'webhook_status_update',
            'bot_id': bot_id,
            'data': webhook_data,
            'timestamp': datetime.now().isoformat()
        }

        await self._send_to_subscription_type(bot_id, 'webhook_status', message)
    
    async def send_new_user_message(self, bot_id: str, line_user_id: str, message_data: dict):
        """發送新用戶訊息通知（含去重機制）"""
        line_message_id = message_data.get('line_message_id')

        # 簡化的去重機制
        if line_message_id and self._is_message_duplicate(bot_id, line_message_id):
            logger.debug(f"WebSocket 消息已發送過，跳過: {line_message_id}")
            return

        # 記錄消息 ID（如果存在）
        if line_message_id:
            self._record_message_id(bot_id, line_message_id)

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
        await self._send_to_subscription_type(bot_id, 'activities', message)

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
    
    async def _send_to_subscription_type(self, bot_id: str, subscription_type: str, message: dict):
        """向特定訂閱類型的訂閱者發送消息"""
        if bot_id not in self.bot_subscribers or subscription_type not in self.bot_subscribers[bot_id]:
            return

        disconnected = set()
        subscribers = self.bot_subscribers[bot_id][subscription_type]

        for websocket in subscribers.copy():
            try:
                await self.send_to_websocket(websocket, message)
            except Exception as e:
                logger.warning(f"發送訂閱消息失敗: {e}")
                disconnected.add(websocket)

        # 清理斷開的連接
        for websocket in disconnected:
            subscribers.discard(websocket)
    
    async def send_to_websocket(self, websocket: WebSocket, message: dict):
        """安全地發送消息到 WebSocket"""
        try:
            await websocket.send_text(json.dumps(message, ensure_ascii=False))
        except Exception as e:
            logger.error(f"WebSocket 發送失敗: {e}")
            raise
    
    async def _subscribe_to_type(self, bot_id: str, websocket: WebSocket, subscription_type: str):
        """統一的訂閱方法"""
        if bot_id not in self.bot_subscribers:
            self.bot_subscribers[bot_id] = {}

        if subscription_type not in self.bot_subscribers[bot_id]:
            self.bot_subscribers[bot_id][subscription_type] = set()

        self.bot_subscribers[bot_id][subscription_type].add(websocket)
        logger.info(f"Bot {bot_id} 新增 {subscription_type} 訂閱")

        await self.send_to_websocket(websocket, {
            'type': 'subscribed',
            'subscription': subscription_type,
            'bot_id': bot_id,
            'timestamp': datetime.now().isoformat()
        })

    async def subscribe_to_analytics(self, bot_id: str, websocket: WebSocket):
        """訂閱分析數據更新"""
        await self._subscribe_to_type(bot_id, websocket, 'analytics')

    async def subscribe_to_activities(self, bot_id: str, websocket: WebSocket):
        """訂閱活動更新"""
        await self._subscribe_to_type(bot_id, websocket, 'activities')

    async def subscribe_to_webhook_status(self, bot_id: str, websocket: WebSocket):
        """訂閱 Webhook 狀態更新"""
        await self._subscribe_to_type(bot_id, websocket, 'webhook_status')
    
    def get_connection_stats(self) -> dict:
        """獲取連接統計"""
        # 計算訂閱統計
        subscription_stats = {}
        for bot_id, subscriptions in self.bot_subscribers.items():
            subscription_stats[bot_id] = {
                sub_type: len(subs) for sub_type, subs in subscriptions.items()
            }

        return {
            'bot_connections': {bot_id: len(connections) for bot_id, connections in self.bot_connections.items()},
            'total_bot_connections': sum(len(connections) for connections in self.bot_connections.values()),
            'subscription_stats': subscription_stats,
            'message_cache': {bot_id: len(msgs) for bot_id, msgs in self.sent_messages.items()}
        }

    def _is_message_duplicate(self, bot_id: str, line_message_id: str) -> bool:
        """檢查消息是否重複"""
        return (bot_id in self.sent_messages and
                line_message_id in self.sent_messages[bot_id])

    def _record_message_id(self, bot_id: str, line_message_id: str):
        """記錄消息 ID 並管理快取大小"""
        if bot_id not in self.sent_messages:
            self.sent_messages[bot_id] = set()

        self.sent_messages[bot_id].add(line_message_id)

        # 自動清理過大的快取
        if len(self.sent_messages[bot_id]) > self.message_cache_size:
            # 移除一半的舊記錄（簡單的 LRU 策略）
            messages_list = list(self.sent_messages[bot_id])
            keep_count = self.message_cache_size // 2
            self.sent_messages[bot_id] = set(messages_list[-keep_count:])
            logger.debug(f"自動清理 Bot {bot_id} 的消息快取，保留最新 {keep_count} 條記錄")

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
