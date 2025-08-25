"""
LINE Bot Webhook API 路由
處理來自 LINE 平台的 Webhook 事件
"""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.bot import Bot
from app.services.line_bot_service import LineBotService
from app.services.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/webhooks/{bot_id}")
async def handle_webhook_event(
    bot_id: str,
    request: Request,
    db: Session = Depends(get_db),
    x_line_signature: Optional[str] = Header(None, alias="X-Line-Signature")
):
    """
    處理 LINE Bot Webhook 事件
    
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
        
        # 檢查是否為 LINE 平台的驗證請求
        # LINE 驗證時可能發送空內容或沒有簽名的請求
        if not body or len(body) == 0:
            logger.info(f"收到 LINE 平台驗證請求: {bot_id}")
            return Response(status_code=200)
        
        # 檢查是否為 LINE 驗證請求 (沒有簽名但有內容)
        if not x_line_signature:
            logger.info(f"收到無簽名請求，可能為 LINE 驗證: {bot_id}")
            # 嘗試解析內容，如果是有效的 JSON 則處理，否則返回 200
            try:
                body_str = body.decode('utf-8')
                json_data = json.loads(body_str) if body_str else {}
                if not json_data.get('events'):
                    logger.info(f"驗證請求無事件內容: {bot_id}")
                    return Response(status_code=200)
            except:
                logger.info(f"非 JSON 驗證請求: {bot_id}")
                return Response(status_code=200)
        
        # 驗證簽名 (只有當有簽名時才驗證)
        if x_line_signature and not line_bot_service.verify_signature(body, x_line_signature):
            logger.error(f"簽名驗證失敗: {bot_id}")
            logger.error(f"接收到的簽名: {x_line_signature}")
            logger.error(f"請求內容長度: {len(body)}")
            logger.error(f"請求內容: {body.decode('utf-8') if body else 'empty'}")
            raise HTTPException(status_code=400, detail="簽名驗證失敗")
        
        # 處理 Webhook 事件
        result = line_bot_service.handle_webhook_event(body, db, bot_id)

        # 發送即時活動更新到 WebSocket
        try:
            webhook_data = json.loads(body.decode('utf-8'))
            events = webhook_data.get('events', [])

            for event in events:
                activity_data = {
                    'event_type': event.get('type'),
                    'timestamp': event.get('timestamp'),
                    'source_type': event.get('source', {}).get('type'),
                    'user_id': event.get('source', {}).get('userId'),
                    'message_type': event.get('message', {}).get('type') if event.get('message') else None,
                    'message_text': event.get('message', {}).get('text') if event.get('message', {}).get('type') == 'text' else None
                }

                # 發送活動更新
                await websocket_manager.send_activity_update(bot_id, activity_data)
                logger.debug(f"已發送活動更新到 WebSocket: {bot_id}")

        except Exception as ws_error:
            logger.warning(f"發送 WebSocket 更新失敗: {ws_error}")

        if result:
            logger.info(f"Webhook 事件處理成功: {bot_id}, 事件數量: {len(result) if isinstance(result, list) else 1}")
        else:
            logger.info(f"Webhook 事件處理完成，無返回結果: {bot_id}")

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