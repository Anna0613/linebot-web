"""
LINE Bot Webhook API 路由
處理來自 LINE 平台的 Webhook 事件
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.bot import Bot
from app.services.line_bot_service import LineBotService

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
        
        # 驗證簽名
        if not line_bot_service.verify_signature(body, x_line_signature):
            logger.error(f"簽名驗證失敗: {bot_id}")
            raise HTTPException(status_code=400, detail="簽名驗證失敗")
        
        # 處理 Webhook 事件
        result = line_bot_service.handle_webhook_event(body, db, bot_id)
        
        if result:
            logger.info(f"Webhook 事件處理成功: {bot_id}, 事件類型: {result.get('event_type', 'unknown')}")
        else:
            logger.warning(f"Webhook 事件處理失敗: {bot_id}")
        
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
        
        # 構建 Webhook URL（需要根據實際部署環境調整）
        webhook_url = f"/api/v1/webhooks/{bot_id}"
        
        return {
            "bot_id": bot_id,
            "webhook_url": webhook_url,
            "configured": bool(bot.channel_token and bot.channel_secret),
            "status": "ready" if bot.channel_token and bot.channel_secret else "not_configured"
        }
        
    except Exception as e:
        logger.error(f"獲取 Webhook 信息失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取 Webhook 信息失敗: {str(e)}")

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