"""
LINE Bot Webhook API 路由 - 重構版本
處理來自 LINE 平台的 Webhook 事件，包含重複檢查機制
"""
import json
import logging
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from app.database import get_db
from app.models.bot import Bot
from app.services.line_bot_service import LineBotService
from app.services.conversation_service import ConversationService
from app.services.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/webhooks/{bot_id}/test")
async def test_webhook_connection(bot_id: str):
    """測試 Webhook 連接"""
    logger.info(f"🧪 測試 Webhook 連接: Bot ID = {bot_id}")
    return {
        "status": "ok",
        "bot_id": bot_id,
        "message": "Webhook 端點正常運作",
        "timestamp": "2025-08-26T02:50:00.000Z"
    }

@router.post("/webhooks/{bot_id}")
async def handle_webhook_event(
    bot_id: str,
    request: Request,
    db: Session = Depends(get_db),
    x_line_signature: Optional[str] = Header(None, alias="X-Line-Signature")
):
    """
    處理 LINE Bot Webhook 事件 - 重構版本
    包含重複檢查機制，防止重複處理相同訊息

    Args:
        bot_id: Bot ID
        request: HTTP 請求對象
        db: 數據庫會話
        x_line_signature: LINE 簽名驗證頭

    Returns:
        200 OK 響應
    """
    try:
        # 獲取請求體
        body = await request.body()
        logger.info(f"📥 收到 Webhook 請求: Bot ID = {bot_id}, 內容長度 = {len(body)}")

        # 查找對應的 Bot
        bot = db.query(Bot).filter(Bot.id == bot_id).first()
        if not bot:
            logger.error(f"Bot 不存在: {bot_id}")
            raise HTTPException(status_code=404, detail="Bot 不存在")

        if not bot.channel_token or not bot.channel_secret:
            logger.error(f"Bot 配置不完整: {bot_id}")
            raise HTTPException(status_code=400, detail="Bot 配置不完整")

        # 初始化 LINE Bot Service
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)

        # 處理 LINE 平台驗證請求
        if not body or len(body) == 0:
            logger.info(f"收到 LINE 平台驗證請求: {bot_id}")
            return Response(status_code=200)

        # 驗證簽名
        if x_line_signature and not line_bot_service.verify_signature(body, x_line_signature):
            logger.error(f"簽名驗證失敗: {bot_id}")
            raise HTTPException(status_code=400, detail="簽名驗證失敗")

        # 解析 Webhook 事件
        try:
            webhook_data = json.loads(body.decode('utf-8'))
            events = webhook_data.get('events', [])
            logger.info(f"📋 收到 {len(events)} 個事件")
        except Exception as e:
            logger.error(f"❌ 解析 webhook 內容失敗: {e}")
            raise HTTPException(status_code=400, detail="無效的 JSON 格式")

        # 處理每個事件（含重複檢查）
        processed_events = []
        for i, event in enumerate(events):
            try:
                logger.info(f"🔍 處理事件 {i+1}: type={event.get('type')}")
                result = await process_single_event(event, bot_id, line_bot_service, db)
                if result:
                    processed_events.append(result)
                    logger.info(f"✅ 事件 {i+1} 處理成功")
                else:
                    logger.info(f"⏭️ 事件 {i+1} 跳過（重複或無需處理）")
            except Exception as e:
                logger.error(f"❌ 處理事件 {i+1} 失敗: {e}")
                # 繼續處理其他事件，不中斷整個流程

        logger.info(f"✅ Webhook 處理完成，成功處理 {len(processed_events)} 個事件")

        # 發送 WebSocket 通知（僅針對成功處理的事件）
        if processed_events:
            try:
                await send_websocket_notifications(bot_id, processed_events)
            except Exception as ws_error:
                logger.warning(f"發送 WebSocket 更新失敗: {ws_error}")

        # 返回 200 OK，告知 LINE 平台事件已處理
        return Response(status_code=200)
        
    except HTTPException:
        # 重新拋出 HTTP 異常
        raise
    except Exception as e:
        logger.error(f"處理 Webhook 事件時發生錯誤: {str(e)}")
        # 即使內部處理失敗，也要返回 200 給 LINE 平台
        # 避免 LINE 平台重複發送事件
        return Response(status_code=200)

@router.get("/webhooks/{bot_id}/info")
async def get_webhook_info(
    bot_id: str,
    db: Session = Depends(get_db)
):
    """
    獲取 Webhook 配置信息
    
    Args:
        bot_id: Bot ID
        db: 數據庫會話
    
    Returns:
        Webhook 配置信息
    """
    try:
        # 查找對應的 Bot
        bot = db.query(Bot).filter(Bot.id == bot_id).first()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot 不存在")
        
        # 構建完整的 Webhook URL
        import os
        webhook_domain = os.getenv('WEBHOOK_DOMAIN', 'http://localhost:8000')
        webhook_url = f"{webhook_domain}/api/v1/webhooks/{bot_id}"
        
        return {
            "bot_id": bot_id,
            "webhook_url": webhook_url,
            "configured": bool(bot.channel_token and bot.channel_secret),
            "status": "ready" if bot.channel_token and bot.channel_secret else "not_configured"
        }
        
    except Exception as e:
        logger.error(f"獲取 Webhook 信息失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取 Webhook 信息失敗: {str(e)}")

@router.get("/webhooks/{bot_id}/status")
async def get_webhook_status(
    bot_id: str,
    db: Session = Depends(get_db)
):
    """
    獲取 Webhook 綁定狀態
    
    Args:
        bot_id: Bot ID
        db: 數據庫會話
    
    Returns:
        Webhook 綁定狀態
    """
    try:
        # 查找對應的 Bot
        bot = db.query(Bot).filter(Bot.id == bot_id).first()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot 不存在")
        
        # 檢查基本配置
        is_configured = bool(bot.channel_token and bot.channel_secret)
        
        # 嘗試檢查與 LINE API 的連接狀態和 Webhook 設定
        webhook_working = False
        line_api_accessible = False
        webhook_endpoint_info = None
        last_webhook_time = None
        
        if is_configured:
            try:
                # 初始化 LINE Bot Service 來測試連接
                line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
                line_api_accessible = line_bot_service.check_connection()
                
                # 檢查 Webhook 端點設定
                webhook_endpoint_info = line_bot_service.check_webhook_endpoint()
                webhook_working = (
                    webhook_endpoint_info.get("is_set", False) and 
                    webhook_endpoint_info.get("active", False)
                )
                
            except Exception as e:
                logger.error(f"檢查 LINE API 連接失敗: {e}")
                line_api_accessible = False
                webhook_working = False
                webhook_endpoint_info = {"error": str(e)}
        
        # 判斷整體狀態
        if not is_configured:
            status = "not_configured"
            status_text = "未設定"
        elif not line_api_accessible:
            status = "configuration_error"
            status_text = "設定錯誤"
        elif webhook_working:
            status = "active"
            status_text = "已綁定"
        else:
            status = "inactive"
            status_text = "未綁定"
        
        from datetime import datetime
        
        # 獲取 webhook 域名
        import os
        webhook_domain = os.getenv('WEBHOOK_DOMAIN', 'http://localhost:8000')
        
        return {
            "bot_id": bot_id,
            "bot_name": bot.name,
            "status": status,
            "status_text": status_text,
            "is_configured": is_configured,
            "line_api_accessible": line_api_accessible,
            "webhook_working": webhook_working,
            "webhook_url": f"{webhook_domain}/api/v1/webhooks/{bot_id}",
            "webhook_endpoint_info": webhook_endpoint_info,
            "last_webhook_time": last_webhook_time,
            "checked_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"獲取 Webhook 狀態失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取狀態失敗: {str(e)}")

@router.get("/webhooks/{bot_id}/debug")
async def debug_webhook_config(
    bot_id: str,
    db: Session = Depends(get_db)
):
    """
    除錯 Webhook 配置
    
    Args:
        bot_id: Bot ID
        db: 數據庫會話
    
    Returns:
        除錯資訊
    """
    try:
        # 查找對應的 Bot
        bot = db.query(Bot).filter(Bot.id == bot_id).first()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot 不存在")
        
        # 獲取 webhook 域名
        import os
        webhook_domain = os.getenv('WEBHOOK_DOMAIN', 'http://localhost:8000')
        
        return {
            "bot_id": bot_id,
            "bot_name": bot.name,
            "has_channel_token": bool(bot.channel_token),
            "has_channel_secret": bool(bot.channel_secret),
            "channel_token_length": len(bot.channel_token) if bot.channel_token else 0,
            "channel_secret_length": len(bot.channel_secret) if bot.channel_secret else 0,
            "webhook_url": f"{webhook_domain}/api/v1/webhooks/{bot_id}",
            "status": "configured" if (bot.channel_token and bot.channel_secret) else "not_configured"
        }
        
    except Exception as e:
        logger.error(f"除錯 Webhook 配置失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"除錯失敗: {str(e)}")

@router.post("/webhooks/{bot_id}/test")
async def test_webhook_connection(
    bot_id: str,
    db: Session = Depends(get_db)
):
    """
    測試 Webhook 連接
    
    Args:
        bot_id: Bot ID
        db: 數據庫會話
    
    Returns:
        測試結果
    """
    try:
        # 查找對應的 Bot
        bot = db.query(Bot).filter(Bot.id == bot_id).first()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot 不存在")
        
        if not bot.channel_token or not bot.channel_secret:
            raise HTTPException(status_code=400, detail="Bot 配置不完整")
        
        # 初始化 LINE Bot Service
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        # 檢查連接狀態
        is_healthy = line_bot_service.check_connection()
        
        return {
            "bot_id": bot_id,
            "connection_status": "ok" if is_healthy else "failed",
            "timestamp": "2024-08-23T12:00:00Z"
        }
        
    except Exception as e:
        logger.error(f"測試 Webhook 連接失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"測試連接失敗: {str(e)}")


async def process_single_event(
    event: Dict[str, Any],
    bot_id: str,
    line_bot_service: LineBotService,
    db: Session
) -> Optional[Dict[str, Any]]:
    """
    處理單個 LINE 事件（含重複檢查）

    Args:
        event: LINE 事件數據
        bot_id: Bot ID
        line_bot_service: LINE Bot 服務實例
        db: 數據庫會話

    Returns:
        處理結果，如果是重複事件則返回 None
    """
    try:
        event_type = event.get('type')
        source = event.get('source', {})
        source_type = source.get('type')
        user_id = source.get('userId')

        logger.info(f"處理事件: type={event_type}, source={source_type}, user={user_id}")

        # 只處理用戶訊息事件
        if event_type != 'message' or source_type != 'user' or not user_id:
            logger.info(f"跳過非用戶訊息事件: {event_type}")
            return None

        message = event.get('message', {})
        message_type = message.get('type')
        line_message_id = message.get('id')

        if not line_message_id:
            logger.warning("事件缺少 LINE 訊息 ID，跳過處理")
            return None

        # 檢查是否已處理過此訊息
        existing_message = await ConversationService.add_user_message(
            bot_id=bot_id,
            line_user_id=user_id,
            event_type=event_type,
            message_type=message_type,
            message_content=message,
            line_message_id=line_message_id
        )

        # 如果是新訊息，處理媒體檔案
        if existing_message and existing_message.line_message_id == line_message_id:
            if message_type in ['image', 'video', 'audio']:
                # 異步處理媒體檔案
                asyncio.create_task(
                    process_media_async(
                        bot_id=bot_id,
                        user_id=user_id,
                        message_type=message_type,
                        line_message_id=line_message_id,
                        line_bot_service=line_bot_service
                    )
                )

        return {
            'event_type': event_type,
            'message_type': message_type,
            'user_id': user_id,
            'line_message_id': line_message_id,
            'timestamp': event.get('timestamp'),
            'processed': True
        }

    except Exception as e:
        logger.error(f"處理事件失敗: {e}")
        return None


async def process_media_async(
    bot_id: str,
    user_id: str,
    message_type: str,
    line_message_id: str,
    line_bot_service: LineBotService
):
    """
    異步處理媒體檔案
    """
    try:
        logger.info(f"開始處理媒體檔案: {message_type}, {line_message_id}")

        from app.services.minio_service import get_minio_service
        minio_service = get_minio_service()

        if not minio_service:
            logger.error("MinIO 服務未初始化")
            return

        # 下載並上傳媒體檔案
        media_path, media_url = await minio_service.upload_media_from_line(
            line_user_id=user_id,
            message_type=message_type,
            channel_token=line_bot_service.channel_token,
            line_message_id=line_message_id
        )

        if media_path and media_url:
            # 更新訊息的媒體資訊
            conversation = await ConversationService.get_conversation_by_line_message_id(
                bot_id, line_message_id
            )
            if conversation:
                for message in conversation.messages:
                    if message.line_message_id == line_message_id:
                        message.media_path = media_path
                        message.media_url = media_url
                        await conversation.save()
                        logger.info(f"媒體檔案處理完成: {media_path}")
                        break

    except Exception as e:
        logger.error(f"處理媒體檔案失敗: {e}")


async def send_websocket_notifications(bot_id: str, processed_events: list):
    """
    發送 WebSocket 通知
    """
    try:
        for event_result in processed_events:
            # 發送活動更新
            activity_data = {
                'event_type': event_result.get('event_type'),
                'timestamp': event_result.get('timestamp'),
                'user_id': event_result.get('user_id'),
                'message_type': event_result.get('message_type'),
                'line_message_id': event_result.get('line_message_id')
            }

            await websocket_manager.send_activity_update(bot_id, activity_data)

            # 發送新用戶訊息通知
            if event_result.get('event_type') == 'message':
                await websocket_manager.send_new_user_message(
                    bot_id,
                    event_result.get('user_id'),
                    {
                        'event_type': event_result.get('event_type'),
                        'message_type': event_result.get('message_type'),
                        'line_message_id': event_result.get('line_message_id'),
                        'timestamp': event_result.get('timestamp')
                    }
                )

        # 發送分析數據更新
        if processed_events:
            await websocket_manager.send_analytics_update(bot_id, {
                'updated_at': datetime.now().isoformat(),
                'trigger': 'webhook_event',
                'event_count': len(processed_events)
            })

    except Exception as e:
        logger.error(f"發送 WebSocket 通知失敗: {e}")