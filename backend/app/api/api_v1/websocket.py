"""
WebSocket API 路由
提供即時數據更新功能
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Optional
import json
import asyncio
import logging

from app.database import get_db
from app.models.bot import Bot
from app.models.user import User
from app.services.websocket_manager import websocket_manager
from app.api.dependencies import get_current_user_websocket
from app.core.security import verify_token

logger = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/ws/bot/{bot_id}")
async def websocket_bot_endpoint(
    websocket: WebSocket,
    bot_id: str,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Bot 專用 WebSocket 端點"""

    # WebSocket 認證檢查
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    try:
        # 驗證 token 並獲取用戶
        payload = verify_token(token)
        user_id = payload.get("sub")

        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return

        user = db.query(User).filter(User.username == user_id).first()
        if not user:
            await websocket.close(code=4001, reason="User not found")
            return

    except Exception as e:
        logger.error(f"WebSocket 認證失敗: {e}")
        await websocket.close(code=4001, reason="Authentication failed")
        return

    # 驗證 Bot 存在且屬於該用戶
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == user.id
    ).first()
    if not bot:
        await websocket.close(code=4004, reason="Bot not found or access denied")
        return

    await websocket.accept()
    logger.info(f"WebSocket 連接已接受: Bot {bot_id}, User {user.id}")
    
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
        logger.info(f"WebSocket 連接斷開: Bot {bot_id}")
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

@router.websocket("/ws/dashboard/{user_id}")
async def websocket_dashboard_endpoint(
    websocket: WebSocket,
    user_id: str,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """用戶儀表板 WebSocket 端點"""

    # WebSocket 認證檢查
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    try:
        # 驗證 token 並獲取用戶
        payload = verify_token(token)
        token_user_id = payload.get("sub")

        if not token_user_id or token_user_id != user_id:
            await websocket.close(code=4001, reason="Invalid token or user mismatch")
            return

        user = db.query(User).filter(User.username == user_id).first()
        if not user:
            await websocket.close(code=4004, reason="User not found")
            return

    except Exception as e:
        logger.error(f"儀表板 WebSocket 認證失敗: {e}")
        await websocket.close(code=4001, reason="Authentication failed")
        return

    await websocket.accept()
    logger.info(f"儀表板 WebSocket 連接已接受: User {user_id}")
    
    # 註冊連接
    await websocket_manager.connect_user_dashboard(user_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 處理儀表板相關消息
            await handle_dashboard_message(user_id, message, websocket, db)
            
    except WebSocketDisconnect:
        logger.info(f"儀表板 WebSocket 斷開: User {user_id}")
    except Exception as e:
        logger.error(f"儀表板 WebSocket 錯誤: {e}")
    finally:
        await websocket_manager.disconnect_user_dashboard(user_id, websocket)

async def handle_websocket_message(bot_id: str, message: dict, websocket: WebSocket, db: Session):
    """處理 Bot WebSocket 消息"""
    
    message_type = message.get('type')
    logger.debug(f"處理 WebSocket 消息: {message_type} for Bot {bot_id}")
    
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

async def handle_dashboard_message(user_id: str, message: dict, websocket: WebSocket, db: Session):
    """處理儀表板 WebSocket 消息"""
    
    message_type = message.get('type')
    logger.debug(f"處理儀表板消息: {message_type} for User {user_id}")
    
    try:
        if message_type == 'ping':
            await websocket.send_text(json.dumps({
                'type': 'pong',
                'timestamp': message.get('timestamp')
            }))
            
        elif message_type == 'subscribe_user_bots':
            # 訂閱用戶所有 Bot 的更新
            user_bots = db.query(Bot).filter(Bot.user_id == user_id).all()
            bot_ids = [str(bot.id) for bot in user_bots]
            
            await websocket.send_text(json.dumps({
                'type': 'user_bots_subscribed',
                'bot_ids': bot_ids,
                'count': len(bot_ids)
            }))
            
        else:
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': f'Unknown dashboard message type: {message_type}'
            }))
            
    except Exception as e:
        logger.error(f"處理儀表板消息失敗: {e}")
        await websocket.send_text(json.dumps({
            'type': 'error',
            'message': 'Failed to process dashboard message'
        }))

async def send_initial_data(bot_id: str, websocket: WebSocket, db: Session):
    """發送初始數據"""
    try:
        # 獲取 Bot 基本信息
        bot = db.query(Bot).filter(Bot.id == bot_id).first()
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_websocket)
):
    """向特定 Bot 的所有 WebSocket 連接廣播消息"""
    try:
        # 驗證 Bot 所有權
        bot = db.query(Bot).filter(
            Bot.id == bot_id,
            Bot.user_id == current_user.id
        ).first()
        
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

@router.post("/ws/test/{bot_id}/analytics_update")
async def test_analytics_update(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_websocket)
):
    """測試分析數據更新（用於調試）"""
    try:
        # 驗證 Bot 所有權
        bot = db.query(Bot).filter(
            Bot.id == bot_id,
            Bot.user_id == current_user.id
        ).first()
        
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        # 發送測試分析更新消息
        await websocket_manager.send_analytics_update(bot_id, {
            "test": True,
            "timestamp": "test_update_" + str(hash(bot_id))
        })
        
        return {
            "success": True,
            "message": "Analytics update test message sent"
        }
        
    except Exception as e:
        logger.error(f"發送測試消息失敗: {e}")
        raise HTTPException(status_code=500, detail="Failed to send test message")
