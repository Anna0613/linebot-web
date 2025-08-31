"""
LINE Bot 分析 API 路由
提供 Bot 數據分析、統計和監控功能
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import json

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.bot import Bot
from app.services.line_bot_service import LineBotService

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
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
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
        
        # 從數據庫獲取真實統計數據
        analytics_data = line_bot_service.get_bot_analytics_real(db, bot_id, start_date, end_date)
        analytics_data.update({
            "period": period,
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat()
        })
        
        return analytics_data
        
    except Exception as e:
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
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        # 從數據庫獲取真實的訊息統計數據
        stats = line_bot_service.get_message_stats_real(db, bot_id, days)
        
        return stats
        
    except Exception as e:
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
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        # 從數據庫獲取真實的用戶活躍度數據
        activity = line_bot_service.get_user_activity_real(db, bot_id)
        
        return activity
        
    except Exception as e:
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
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        # 從數據庫獲取真實的功能使用統計
        usage_stats = line_bot_service.get_usage_stats_real(db, bot_id)
        
        return usage_stats
        
    except Exception as e:
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
    """獲取 Bot 的用戶列表"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        # 獲取關注者列表
        followers_data = line_bot_service.get_bot_followers(db, bot_id, limit, offset)
        
        return {
            "bot_id": bot_id,
            "users": followers_data["followers"],
            "total_count": followers_data["total_count"],
            "pagination": followers_data["page_info"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取用戶列表失敗: {str(e)}")

@router.get("/{bot_id}/users/{line_user_id}/interactions")
async def get_user_interactions(
    bot_id: str,
    line_user_id: str,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """獲取特定用戶的互動歷史"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        # 獲取用戶互動歷史
        interactions = line_bot_service.get_user_interaction_history(db, bot_id, line_user_id, limit)
        
        return {
            "bot_id": bot_id,
            "line_user_id": line_user_id,
            "interactions": interactions
        }
        
    except Exception as e:
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
    """發送訊息給特定用戶"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        from app.models.line_user import LineBotUser, LineBotUserInteraction, AdminMessage
        
        # 檢查用戶是否存在
        line_user = db.query(LineBotUser).filter(
            LineBotUser.bot_id == bot_id,
            LineBotUser.line_user_id == line_user_id
        ).first()
        
        if not line_user:
            raise HTTPException(status_code=404, detail="用戶不存在")
        
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        message = message_data.get("message")
        if not message:
            raise HTTPException(status_code=400, detail="需要提供訊息內容")
        
        # 發送訊息到 LINE
        result = line_bot_service.send_message_to_user(line_user_id, message)
        
        # 記錄管理者發送的訊息到 admin_messages 表
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
        
        # 同時記錄到互動記錄表（用於聊天歷史）
        interaction = LineBotUserInteraction(
            line_user_id=line_user.id,  # 這是 LineBotUser 的 UUID
            event_type="message",
            message_type="text",
            message_content={"text": message},
            sender_type="admin",
            admin_user_id=current_user.id,
        )
        db.add(interaction)
        db.commit()
        
        return {
            "success": True,
            "message": "訊息發送成功",
            "result": result
        }
        
    except Exception as e:
        db.rollback()
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """獲取用戶與管理者的聊天記錄"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        print(f"DEBUG: Starting chat history request for bot_id={bot_id}, line_user_id={line_user_id}")
        from app.models.line_user import LineBotUser, LineBotUserInteraction
        from sqlalchemy import or_, and_
        
        # 找到對應的 LineBotUser 記錄
        line_user = db.query(LineBotUser).filter(
            LineBotUser.bot_id == bot_id,
            LineBotUser.line_user_id == line_user_id
        ).first()
        
        if not line_user:
            raise HTTPException(status_code=404, detail="用戶不存在")
        
        # 查詢聊天記錄（包含用戶發送和管理者發送的訊息）
        # 使用 joinedload 預先載入 admin_user 關聯，避免 N+1 查詢問題
        from sqlalchemy.orm import joinedload
        interactions = db.query(LineBotUserInteraction).options(
            joinedload(LineBotUserInteraction.admin_user)
        ).filter(
            and_(
                LineBotUserInteraction.line_user_id == line_user.id,
                or_(
                    LineBotUserInteraction.sender_type == "user",
                    LineBotUserInteraction.sender_type == "admin"
                )
            )
        ).order_by(LineBotUserInteraction.timestamp.desc()).offset(offset).limit(limit).all()
        
        # 格式化聊天記錄
        chat_history = []
        for interaction in interactions:
            try:
                chat_record = {
                    "id": str(interaction.id),
                    "event_type": interaction.event_type or "",
                    "message_type": interaction.message_type or "",
                    "message_content": interaction.message_content or "",
                    "sender_type": interaction.sender_type or "user",
                    "timestamp": interaction.timestamp.isoformat() if interaction.timestamp else None,
                    "media_url": interaction.media_url or None,
                    "media_path": interaction.media_path or None,
                }
                
                # 如果是管理者發送的訊息，加入管理者資訊
                if interaction.sender_type == "admin" and hasattr(interaction, 'admin_user') and interaction.admin_user:
                    try:
                        chat_record["admin_user"] = {
                            "id": str(interaction.admin_user.id),
                            "username": interaction.admin_user.username or "unknown"
                        }
                    except Exception as admin_error:
                        # 如果無法取得管理者資訊，記錄錯誤但不中斷處理
                        print(f"Warning: Failed to get admin user info: {admin_error}")
                        chat_record["admin_user"] = None
                
                chat_history.append(chat_record)
                
            except Exception as record_error:
                # 如果處理單條記錄失敗，記錄錯誤但繼續處理其他記錄
                print(f"Warning: Failed to process interaction {interaction.id}: {record_error}")
                continue
        
        # 反轉順序，讓最舊的訊息在前面（聊天室顯示順序）
        chat_history.reverse()
        
        return {
            "success": True,
            "chat_history": chat_history,
            "total_count": len(chat_history),
            "has_more": len(interactions) == limit
        }
        
    except Exception as e:
        import traceback
        error_detail = f"獲取聊天記錄失敗: {str(e)}"
        print(f"Chat history API error: {error_detail}")
        print(f"Traceback: {traceback.format_exc()}")
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
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        # 獲取真實的活動記錄
        activities = line_bot_service.get_bot_activities_real(db, bot_id, limit, offset)
        
        return {
            "activities": activities,
            "total_count": len(activities),
            "has_more": len(activities) == limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取活動記錄失敗: {str(e)}")