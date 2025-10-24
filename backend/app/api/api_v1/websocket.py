"""
WebSocket API 路由
提供即時數據更新功能
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Optional
import json
import asyncio
import logging

from app.database_async import get_async_db
from app.models.bot import Bot
from app.models.user import User
from app.services.websocket_manager import websocket_manager
from app.api.dependencies import get_current_user_websocket
from sqlalchemy import select
from app.core.security import verify_token

logger = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/ws/bot/{bot_id}")
async def websocket_bot_endpoint(
    websocket: WebSocket,
    bot_id: str,
    ws_token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_db)
):
    """Bot 專用 WebSocket 端點"""

    # 檢查 Origin 頭（用於 CORS 驗證）
    origin = websocket.headers.get("origin")
    logger.info(f"WebSocket 連接請求 - Bot: {bot_id}, Origin: {origin}")

    # 先接受連接（FastAPI 的 WebSocket 需要先接受才能進行後續操作）
    # 注意：在生產環境中，Cloudflare Tunnel 會處理 CORS，這裡主要是認證檢查
    await websocket.accept()

    try:
        # WebSocket 認證檢查（改用 Cookie）
        token = websocket.cookies.get("token") or ws_token
        if not token:
            logger.warning(f"WebSocket 認證失敗: 缺少 token - Bot {bot_id}")
            await websocket.close(code=4001, reason="Missing authentication")
            return

        # 驗證 token 並獲取用戶
        payload = verify_token(token)
        username = payload.get("sub")

        if not username:
            logger.warning(f"WebSocket 認證失敗: 無效的 token - Bot {bot_id}")
            await websocket.close(code=4001, reason="Invalid token")
            return

        result = await db.execute(select(User).where(User.username == username))
        user = result.scalars().first()
        if not user:
            logger.warning(f"WebSocket 認證失敗: 用戶不存在 - Bot {bot_id}, Username: {username}")
            await websocket.close(code=4001, reason="User not found")
            return

        # 驗證 Bot 存在且屬於該用戶
        result = await db.execute(select(Bot).where(Bot.id == bot_id, Bot.user_id == user.id))
        bot = result.scalars().first()
        if not bot:
            logger.warning(f"WebSocket 認證失敗: Bot 不存在或無權限 - Bot {bot_id}, User {user.id}")
            await websocket.close(code=4004, reason="Bot not found or access denied")
            return

        logger.info(f"✅ WebSocket 連接已建立: Bot {bot_id}, User {user.username} (ID: {user.id}), Origin: {origin}")

        # 註冊連接
        await websocket_manager.connect(bot_id, websocket)

        try:
            while True:
                # 接收客戶端消息
                data = await websocket.receive_text()
                message = json.loads(data)

                # 處理不同類型的消息
                await handle_websocket_message(bot_id, message, websocket, db)

        except WebSocketDisconnect:
            logger.info(f"WebSocket 連接斷開: Bot {bot_id}, User {user.username}")
        except json.JSONDecodeError as e:
            logger.error(f"JSON 解析錯誤: {e}")
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"WebSocket 錯誤: {e}")
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': str(e)
            }))
        finally:
            # 清理連接
            await websocket_manager.disconnect(bot_id, websocket)
            logger.info(f"WebSocket 連接已清理: Bot {bot_id}, User {user.username}")

    except Exception as e:
        logger.error(f"WebSocket 認證或初始化失敗: {e}")
        try:
            await websocket.close(code=4000, reason="Authentication or initialization failed")
        except:
            pass



async def handle_websocket_message(bot_id: str, message: dict, websocket: WebSocket, db: AsyncSession):
    """處理 Bot WebSocket 消息"""
    
    message_type = message.get('type')
    
    try:
        if message_type == 'subscribe_analytics':
            # 訂閱分析數據更新
            await websocket_manager.subscribe_to_analytics(bot_id, websocket)
            
        elif message_type == 'subscribe_activities':
            # 訂閱活動更新
            await websocket_manager.subscribe_to_activities(bot_id, websocket)
            
        elif message_type == 'subscribe_webhook_status':
            # 訂閱 Webhook 狀態更新
            await websocket_manager.subscribe_to_webhook_status(bot_id, websocket)
            
        elif message_type == 'ping':
            # 心跳檢測
            await websocket.send_text(json.dumps({
                'type': 'pong',
                'timestamp': message.get('timestamp')
            }))
            
        elif message_type == 'get_initial_data':
            # 獲取初始數據
            await send_initial_data(bot_id, websocket, db)
            
        else:
            logger.warning(f"未知的消息類型: {message_type}")
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': f'Unknown message type: {message_type}'
            }))
            
    except Exception as e:
        logger.error(f"處理 WebSocket 消息失敗: {e}")
        await websocket.send_text(json.dumps({
            'type': 'error',
            'message': 'Failed to process message'
        }))



async def send_initial_data(bot_id: str, websocket: WebSocket, db: AsyncSession):
    """發送初始數據"""
    try:
        # 獲取 Bot 基本信息
        result = await db.execute(select(Bot).where(Bot.id == bot_id))
        bot = result.scalars().first()
        if not bot:
            return
        
        initial_data = {
            'type': 'initial_data',
            'bot_id': bot_id,
            'data': {
                'bot_name': bot.name,
                'is_configured': bool(bot.channel_token and bot.channel_secret),
                'created_at': bot.created_at.isoformat() if bot.created_at else None,
                'updated_at': bot.updated_at.isoformat() if bot.updated_at else None
            }
        }
        
        await websocket.send_text(json.dumps(initial_data, ensure_ascii=False))
        
    except Exception as e:
        logger.error(f"發送初始數據失敗: {e}")

@router.get("/ws/stats")
async def get_websocket_stats():
    """獲取 WebSocket 連接統計"""
    try:
        stats = websocket_manager.get_connection_stats()
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        logger.error(f"獲取 WebSocket 統計失敗: {e}")
        raise HTTPException(status_code=500, detail="Failed to get WebSocket stats")

@router.post("/ws/broadcast/{bot_id}")
async def broadcast_to_bot(
    bot_id: str,
    message: dict,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_websocket)
):
    """向特定 Bot 的所有 WebSocket 連接廣播消息"""
    try:
        # 驗證 Bot 所有權（避免阻塞事件圈）
        result = await db.execute(select(Bot).where(Bot.id == bot_id, Bot.user_id == current_user.id))
        bot = result.scalars().first()
        
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        # 廣播消息
        await websocket_manager.broadcast_to_bot(bot_id, message)
        
        return {
            "success": True,
            "message": "Message broadcasted successfully"
        }
        
    except Exception as e:
        logger.error(f"廣播消息失敗: {e}")
        raise HTTPException(status_code=500, detail="Failed to broadcast message")

