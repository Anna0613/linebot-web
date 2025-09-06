"""
LINE Bot 分析 API 路由
提供 Bot 數據分析、統計和監控功能
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import json
import logging

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.bot import Bot
from app.services.line_bot_service import LineBotService

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{bot_id}/analytics")
async def get_bot_analytics(
    bot_id: str,
    period: Optional[str] = "week",  # day, week, month
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """獲取 Bot 分析數據"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        # 計算時間範圍
        end_date = datetime.now()
        if period == "day":
            start_date = end_date - timedelta(days=1)
        elif period == "week":
            start_date = end_date - timedelta(weeks=1)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(weeks=1)

        # 使用 MongoDB ConversationService 獲取分析數據
        from app.services.conversation_service import ConversationService

        analytics_data = await ConversationService.get_bot_analytics(bot_id, start_date, end_date)
        analytics_data.update({
            "period": period,
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat()
        })

        return analytics_data

    except Exception as e:
        logger.error(f"獲取分析數據失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取分析數據失敗: {str(e)}")

@router.get("/{bot_id}/messages/stats")
async def get_message_stats(
    bot_id: str,
    days: Optional[int] = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """獲取訊息統計數據"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        # 使用 MongoDB ConversationService 獲取訊息統計
        from app.services.conversation_service import ConversationService

        stats = await ConversationService.get_message_stats(bot_id, days)

        return stats

    except Exception as e:
        logger.error(f"獲取訊息統計失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取訊息統計失敗: {str(e)}")

@router.get("/{bot_id}/users/activity")
async def get_user_activity(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """獲取用戶活躍度數據"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        # 使用 MongoDB ConversationService 獲取用戶活躍度數據
        from app.services.conversation_service import ConversationService

        activity = await ConversationService.get_user_activity(bot_id)

        return activity

    except Exception as e:
        logger.error(f"獲取用戶活躍度失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取用戶活躍度失敗: {str(e)}")

@router.get("/{bot_id}/usage/stats")
async def get_usage_stats(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """獲取功能使用統計"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        # 使用 MongoDB ConversationService 獲取功能使用統計
        from app.services.conversation_service import ConversationService

        usage_stats = await ConversationService.get_usage_stats(bot_id)

        return usage_stats

    except Exception as e:
        logger.error(f"獲取使用統計失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取使用統計失敗: {str(e)}")

@router.post("/{bot_id}/send-message")
async def send_test_message(
    bot_id: str,
    message_data: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """發送測試訊息"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        # 發送測試訊息（需要用戶ID）
        user_id = message_data.get("user_id")
        message = message_data.get("message", "這是一條測試訊息")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="需要提供用戶 ID")
        
        result = line_bot_service.send_text_message(user_id, message)
        
        return {
            "success": True,
            "message": "測試訊息發送成功",
            "result": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"發送訊息失敗: {str(e)}")

@router.get("/{bot_id}/profile")
async def get_bot_profile(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """獲取 Bot 資料"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        # 獲取 Bot 基本資訊
        bot_info = line_bot_service.get_bot_info()
        
        return {
            "id": bot.id,
            "name": bot.name,
            "channel_configured": bool(bot.channel_token),
            "created_at": bot.created_at.isoformat(),
            "updated_at": bot.updated_at.isoformat(),
            "line_info": bot_info,
            "status": "active" if bot.channel_token else "inactive"
        }
        
    except Exception as e:
        # 如果 LINE API 失敗，仍返回本地信息
        return {
            "id": bot.id,
            "name": bot.name,
            "channel_configured": bool(bot.channel_token),
            "created_at": bot.created_at.isoformat(),
            "updated_at": bot.updated_at.isoformat(),
            "line_info": None,
            "status": "active" if bot.channel_token else "inactive",
            "error": f"無法連接到 LINE API: {str(e)}"
        }

@router.get("/{bot_id}/health")
async def check_bot_health(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """檢查 Bot 健康狀態"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        # 檢查連接狀態
        is_healthy = line_bot_service.check_connection()
        
        return {
            "bot_id": bot_id,
            "healthy": is_healthy,
            "last_check": datetime.now().isoformat(),
            "status": "online" if is_healthy else "offline"
        }
        
    except Exception as e:
        return {
            "bot_id": bot_id,
            "healthy": False,
            "last_check": datetime.now().isoformat(),
            "status": "error",
            "error": str(e)
        }

@router.get("/{bot_id}/users")
async def get_bot_users(
    bot_id: str,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """獲取 Bot 的用戶列表（從 MongoDB 和 PostgreSQL 組合數據）"""

    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()

    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")

    try:
        from app.models.line_user import LineBotUser
        from app.services.conversation_service import ConversationService

        # 從 PostgreSQL 獲取用戶基本信息
        users_query = db.query(LineBotUser).filter(
            LineBotUser.bot_id == bot_id
        ).order_by(LineBotUser.last_interaction.desc())

        total_count = users_query.count()
        users = users_query.offset(offset).limit(limit).all()

        # 轉換為前端需要的格式
        user_list = []
        for user in users:
            user_data = {
                "id": str(user.id),
                "line_user_id": user.line_user_id,
                "display_name": user.display_name or "未設定名稱",
                "picture_url": user.picture_url or "",
                "status_message": user.status_message or "",
                "language": user.language or "",
                "first_interaction": user.created_at.isoformat() if user.created_at else "",
                "last_interaction": user.last_interaction.isoformat() if user.last_interaction else "",
                "interaction_count": user.interaction_count or "0",
                "is_followed": user.is_followed
            }
            user_list.append(user_data)

        return {
            "bot_id": bot_id,
            "users": user_list,
            "total_count": total_count,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "has_more": len(user_list) == limit,
                "total": total_count
            }
        }

    except Exception as e:
        logger.error(f"獲取用戶列表失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取用戶列表失敗: {str(e)}")

@router.get("/{bot_id}/users/{line_user_id}/interactions")
async def get_user_interactions(
    bot_id: str,
    line_user_id: str,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """獲取特定用戶的互動歷史（使用 MongoDB）"""

    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()

    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")

    try:
        from app.services.conversation_service import ConversationService

        # 使用 ConversationService 獲取聊天記錄
        chat_history, total_count = await ConversationService.get_chat_history(
            bot_id=bot_id,
            line_user_id=line_user_id,
            limit=limit,
            offset=0
        )

        return {
            "bot_id": bot_id,
            "line_user_id": line_user_id,
            "interactions": chat_history,
            "total_count": total_count
        }

    except Exception as e:
        logger.error(f"獲取用戶互動失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取用戶互動失敗: {str(e)}")

@router.post("/{bot_id}/broadcast")
async def broadcast_message(
    bot_id: str,
    message_data: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """廣播訊息給所有關注者"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        message = message_data.get("message")
        user_ids = message_data.get("user_ids")  # 可選：特定用戶列表
        
        if not message:
            raise HTTPException(status_code=400, detail="需要提供訊息內容")
        
        result = line_bot_service.broadcast_message(message, user_ids)
        
        return {
            "success": True,
            "message": "廣播訊息發送成功",
            "result": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"廣播訊息失敗: {str(e)}")

@router.post("/{bot_id}/users/{line_user_id}/message")
async def send_message_to_user(
    bot_id: str,
    line_user_id: str,
    message_data: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """發送訊息給特定用戶（使用 MongoDB 儲存聊天記錄）"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        from app.models.line_user import AdminMessage
        from app.services.conversation_service import ConversationService
        
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        message = message_data.get("message")
        if not message:
            raise HTTPException(status_code=400, detail="需要提供訊息內容")
        
        # 發送訊息到 LINE
        result = line_bot_service.send_message_to_user(line_user_id, message)
        
        # 記錄管理者發送的訊息到 admin_messages 表（PostgreSQL）
        admin_message = AdminMessage(
            bot_id=bot_id,
            line_user_id=line_user_id,
            admin_user_id=current_user.id,
            message_content=message,
            message_type="text",
            sent_status="sent" if result.get("success") else "failed",
            line_message_id=result.get("message_id")
        )
        db.add(admin_message)
        db.commit()
        
        # 同時記錄到 MongoDB 聊天記錄
        try:
            await ConversationService.add_admin_message(
                bot_id=bot_id,
                line_user_id=line_user_id,
                admin_user=current_user,
                message_content={"text": message},  # 正確的格式
                message_type="text"
            )
            logger.info(f"管理者訊息已記錄到 MongoDB: bot_id={bot_id}, line_user_id={line_user_id}, admin_id={current_user.id}")
        except Exception as mongo_error:
            logger.error(f"記錄訊息到 MongoDB 失敗: {mongo_error}")
            # MongoDB 錯誤不應該影響主要功能，只記錄錯誤
        
        return {
            "success": True,
            "message": "訊息發送成功",
            "result": result
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"發送訊息失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"發送訊息失敗: {str(e)}")

@router.post("/{bot_id}/broadcast/selective")
async def selective_broadcast_message(
    bot_id: str,
    message_data: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """選擇性廣播訊息給指定用戶"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        from app.models.line_user import LineBotUser, AdminMessage
        
        message = message_data.get("message")
        selected_user_ids = message_data.get("user_ids", [])  # LINE User IDs 列表
        
        if not message:
            raise HTTPException(status_code=400, detail="需要提供訊息內容")
        
        if not selected_user_ids:
            raise HTTPException(status_code=400, detail="需要選擇至少一個用戶")
        
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        # 發送訊息到 LINE
        result = line_bot_service.broadcast_message(message, selected_user_ids)
        
        # 為每個選中的用戶記錄管理者發送的訊息
        for line_user_id in selected_user_ids:
            admin_message = AdminMessage(
                bot_id=bot_id,
                line_user_id=line_user_id,
                admin_user_id=current_user.id,
                message_content=message,
                message_type="text",
                sent_status="sent" if result.get("success") else "failed"
            )
            db.add(admin_message)
        
        db.commit()
        
        return {
            "success": True,
            "message": f"訊息已發送給 {len(selected_user_ids)} 個用戶",
            "result": result
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"選擇性廣播失敗: {str(e)}")

@router.get("/{bot_id}/users/{line_user_id}/chat-history")
async def get_chat_history(
    bot_id: str,
    line_user_id: str,
    limit: int = 50,
    offset: int = 0,
    sender_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """獲取用戶與管理者的聊天記錄（使用 MongoDB）"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        from app.services.conversation_service import ConversationService
        
        logger.info(f"獲取聊天記錄: bot_id={bot_id}, line_user_id={line_user_id}, limit={limit}, offset={offset}")
        
        # 使用 ConversationService 獲取聊天記錄
        chat_history, total_count = await ConversationService.get_chat_history(
            bot_id=bot_id,
            line_user_id=line_user_id,
            limit=limit,
            offset=offset,
            sender_type=sender_type
        )
        
        return {
            "success": True,
            "chat_history": chat_history,
            "total_count": total_count,
            "has_more": len(chat_history) == limit,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "total": total_count
            }
        }
        
    except Exception as e:
        import traceback
        error_detail = f"獲取聊天記錄失敗: {str(e)}"
        logger.error(f"Chat history API error: {error_detail}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_detail)

@router.get("/{bot_id}/activities")
async def get_bot_activities(
    bot_id: str,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """獲取 Bot 活動記錄"""

    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()

    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")

    try:
        # 使用 MongoDB ConversationService 獲取活動記錄
        from app.services.conversation_service import ConversationService

        logger.info(f"獲取 Bot 活動記錄: bot_id={bot_id}, limit={limit}, offset={offset}")

        activities = await ConversationService.get_bot_activities(bot_id, limit, offset)

        return {
            "activities": activities,
            "total_count": len(activities),
            "has_more": len(activities) == limit
        }

    except Exception as e:
        logger.error(f"獲取活動記錄失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取活動記錄失敗: {str(e)}")