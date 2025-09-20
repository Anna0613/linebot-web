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
import asyncio

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.bot import Bot
from app.services.line_bot_service import LineBotService

logger = logging.getLogger(__name__)

router = APIRouter()


async def sync_users_from_line_api(db: Session, bot: Bot, line_user_ids: List[str], conversations: List[Dict]) -> List:
    """
    從 LINE API 獲取用戶資料並同步到 PostgreSQL

    Args:
        db: 資料庫會話
        bot: Bot 實例
        line_user_ids: 需要同步的用戶 ID 列表
        conversations: MongoDB 中的對話記錄

    Returns:
        List: 同步後的用戶記錄列表
    """
    from app.models.line_user import LineBotUser
    from linebot.v3.messaging import Configuration, ApiClient, MessagingApi
    from linebot.v3.exceptions import InvalidSignatureError
    import uuid

    synced_users = []

    try:
        # 創建 LINE Bot API 客戶端
        configuration = Configuration(access_token=bot.channel_token)

        with ApiClient(configuration) as api_client:
            line_bot_api = MessagingApi(api_client)

            # 為每個用戶獲取資料並同步
            for line_user_id in line_user_ids:
                try:
                    # 從 LINE API 獲取用戶資料
                    profile = await asyncio.to_thread(line_bot_api.get_profile, line_user_id)

                    # 從對話記錄中獲取互動統計
                    user_conversation = next(
                        (conv for conv in conversations if conv['line_user_id'] == line_user_id),
                        None
                    )

                    if user_conversation:
                        message_count = user_conversation.get('message_count', 0)
                        created_at = user_conversation.get('created_at')
                        updated_at = user_conversation.get('updated_at')

                        # 轉換時間格式
                        if isinstance(created_at, datetime):
                            first_interaction = created_at.replace(tzinfo=None)
                        elif isinstance(created_at, str):
                            try:
                                first_interaction = datetime.fromisoformat(created_at.replace('Z', '+00:00')).replace(tzinfo=None)
                            except:
                                first_interaction = datetime.utcnow()
                        else:
                            first_interaction = datetime.utcnow()

                        if isinstance(updated_at, datetime):
                            last_interaction = updated_at.replace(tzinfo=None)
                        elif isinstance(updated_at, str):
                            try:
                                last_interaction = datetime.fromisoformat(updated_at.replace('Z', '+00:00')).replace(tzinfo=None)
                            except:
                                last_interaction = datetime.utcnow()
                        else:
                            last_interaction = datetime.utcnow()
                    else:
                        message_count = 0
                        first_interaction = datetime.utcnow()
                        last_interaction = datetime.utcnow()

                    # 創建用戶記錄
                    user_record = LineBotUser(
                        id=uuid.uuid4(),
                        bot_id=bot.id,
                        line_user_id=line_user_id,
                        display_name=profile.display_name,
                        picture_url=profile.picture_url or "",
                        status_message=profile.status_message or "",
                        language=profile.language or "zh-TW",
                        is_followed=True,  # 有對話記錄假設為關注者
                        interaction_count=message_count,
                        first_interaction=first_interaction,
                        last_interaction=last_interaction,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )

                    # 保存到資料庫
                    def _save_user():
                        db.add(user_record)
                        db.commit()
                        db.refresh(user_record)
                        return user_record
                    user_record = await asyncio.to_thread(_save_user)

                    synced_users.append(user_record)

                except Exception as e:
                    logger.error(f"同步用戶 {line_user_id} 失敗: {e}")
                    db.rollback()
                    continue

    except Exception as e:
        logger.error(f"LINE API 初始化失敗: {e}")
        db.rollback()
        raise

    return synced_users

@router.get("/{bot_id}/analytics")
async def get_bot_analytics(
    bot_id: str,
    period: Optional[str] = "week",  # day, week, month
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """獲取 Bot 分析數據"""
    
    # 驗證 Bot 所有權
    bot = await asyncio.to_thread(lambda: db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first())
    
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
    bot = await asyncio.to_thread(lambda: db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first())
    
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
    bot = await asyncio.to_thread(lambda: db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first())
    
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
    bot = await asyncio.to_thread(lambda: db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first())
    
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
    bot = await asyncio.to_thread(lambda: db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first())
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        # 發送測試訊息（需要用戶ID）
        user_id = message_data.get("user_id")
        message = message_data.get("message", "這是一條測試訊息")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="需要提供用戶 ID")
        
        # 確保 PostgreSQL 存在該用戶（不可有未知用戶）
        try:
            from app.models.line_user import LineBotUser
            from uuid import UUID as PyUUID
            bot_uuid = PyUUID(bot_id)
            existing = await asyncio.to_thread(lambda: db.query(LineBotUser).filter(LineBotUser.bot_id == bot_uuid, LineBotUser.line_user_id == user_id).first())
            if not existing:
                profile = await asyncio.to_thread(line_bot_service.get_user_profile, user_id)
                new_user = LineBotUser(
                    bot_id=bot_uuid,
                    line_user_id=user_id,
                    display_name=(profile or {}).get("display_name"),
                    picture_url=(profile or {}).get("picture_url"),
                    status_message=(profile or {}).get("status_message"),
                    language=(profile or {}).get("language"),
                    is_followed=True,
                    interaction_count="1"
                )
                await asyncio.to_thread(lambda: (db.add(new_user), db.commit()))
        except Exception:
            db.rollback()

        # 發送
        result = await asyncio.to_thread(line_bot_service.send_text_message, user_id, message)

        # 記錄到 MongoDB 對話（admin 訊息）並即時通知前端
        try:
            from app.services.conversation_service import ConversationService
            from app.services.websocket_manager import websocket_manager
            added = await ConversationService.add_admin_message(
                bot_id=bot_id,
                line_user_id=user_id,
                admin_user=current_user,
                message_content={"text": message},
                message_type="text"
            )
            try:
                admin_user_info = added.admin_user.dict() if hasattr(added.admin_user, 'dict') else {
                    'id': getattr(added.admin_user, 'id', None),
                    'username': getattr(added.admin_user, 'username', None),
                    'full_name': getattr(added.admin_user, 'full_name', None)
                }
                await websocket_manager.broadcast_to_bot(bot_id, {
                    'type': 'chat_message',
                    'bot_id': bot_id,
                    'line_user_id': user_id,
                    'data': {
                        'line_user_id': user_id,
                        'message': {
                            'id': added.id,
                            'event_type': added.event_type,
                            'message_type': added.message_type,
                            'message_content': added.content,
                            'sender_type': added.sender_type,
                            'timestamp': added.timestamp.isoformat() if hasattr(added.timestamp, 'isoformat') else added.timestamp,
                            'media_url': added.media_url,
                            'media_path': added.media_path,
                            'admin_user': admin_user_info
                        }
                    }
                })
            except Exception as ws_err:
                logger.warning(f"推送 WebSocket 聊天消息失敗: {ws_err}")
        except Exception as mongo_error:
            logger.error(f"記錄測試訊息到 MongoDB 失敗: {mongo_error}")

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
    bot = await asyncio.to_thread(lambda: db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first())
    
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
    bot = await asyncio.to_thread(lambda: db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first())
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        # 檢查連接狀態（改用異步版本）
        is_healthy = await line_bot_service.async_check_connection()
        
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
    bot = await asyncio.to_thread(lambda: db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first())

    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")

    try:
        from app.models.line_user import LineBotUser
        from app.services.conversation_service import ConversationService

        # 首先從 MongoDB 獲取有對話記錄的用戶
        conversations, total_conversations = await ConversationService.get_bot_conversations(
            bot_id=bot_id,
            limit=1000,  # 獲取所有對話
            offset=0
        )

        # 提取所有有對話的用戶 ID
        line_user_ids = [conv["line_user_id"] for conv in conversations]

        if not line_user_ids:
            # 如果 MongoDB 中沒有對話記錄，回退到 PostgreSQL
            def _pg_list_all():
                users_query = db.query(LineBotUser).filter(LineBotUser.bot_id == bot_id).order_by(LineBotUser.last_interaction.desc())
                return users_query.count(), users_query.offset(offset).limit(limit).all()
            total_count, users = await asyncio.to_thread(_pg_list_all)
            use_mongodb_data = False
        else:
            # 從 PostgreSQL 獲取這些用戶的基本信息
            def _pg_list_subset():
                users_query = db.query(LineBotUser).filter(
                    LineBotUser.bot_id == bot_id,
                    LineBotUser.line_user_id.in_(line_user_ids)
                ).order_by(LineBotUser.last_interaction.desc())
                return users_query.count(), users_query.offset(offset).limit(limit).all()
            total_count, users = await asyncio.to_thread(_pg_list_subset)

            # 如果 PostgreSQL 中沒有對應的用戶記錄，從 LINE API 獲取並同步
            if len(users) == 0 and len(line_user_ids) > 0:
                # 獲取 Bot 的 LINE 配置
                bot = await asyncio.to_thread(lambda: db.query(Bot).filter(Bot.id == bot_id).first())
                if bot and bot.channel_token:
                    try:
                        # 同步用戶資料到 PostgreSQL
                        synced_users = await sync_users_from_line_api(
                            db, bot, line_user_ids, conversations
                        )
                        logger.info(f"成功同步 {len(synced_users)} 個用戶到 PostgreSQL")

                        # 重新查詢同步後的用戶
                        users = synced_users
                        total_count = len(users)
                        use_mongodb_data = False
                    except Exception as e:
                        logger.error(f"同步用戶資料失敗: {e}")
                        # 同步失敗時回退到 MongoDB 資料
                        use_mongodb_data = True
                        total_count = len(conversations)
                else:
                    logger.warning("Bot 沒有配置 LINE Channel Token，無法同步用戶資料")
                    use_mongodb_data = True
                    total_count = len(conversations)
            else:
                use_mongodb_data = False

        # 轉換為前端需要的格式
        user_list = []

        if use_mongodb_data:
            # 直接從 MongoDB 對話記錄創建用戶列表

            for i, conv in enumerate(conversations):
                if i >= offset and len(user_list) < limit:
                    # 獲取最後一條訊息的時間作為最後互動時間
                    last_message_time = conv.get('updated_at', conv.get('created_at', ''))
                    if isinstance(last_message_time, str):
                        last_interaction = last_message_time
                    else:
                        last_interaction = last_message_time.isoformat() if last_message_time else ""

                    user_data = {
                        "id": f"mongo_{conv['line_user_id']}",  # 臨時 ID
                        "line_user_id": conv['line_user_id'],
                        "display_name": "未設定名稱",  # MongoDB 中沒有顯示名稱
                        "picture_url": "",
                        "status_message": "",
                        "language": "",
                        "first_interaction": conv.get('created_at', ''),
                        "last_interaction": last_interaction,
                        "interaction_count": str(conv.get('message_count', 0)),
                        "is_followed": True  # 假設有對話記錄就是關注者
                    }
                    user_list.append(user_data)
        else:
            # 從 PostgreSQL 用戶記錄創建用戶列表
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



        result = {
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

        return result

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
    bot = await asyncio.to_thread(lambda: db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first())

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
    bot = await asyncio.to_thread(lambda: db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first())
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        message = message_data.get("message")
        user_ids = message_data.get("user_ids")  # 可選：特定用戶列表
        
        if not message:
            raise HTTPException(status_code=400, detail="需要提供訊息內容")
        
        result = await asyncio.to_thread(line_bot_service.broadcast_message, message, user_ids)

        # 取得廣播對象清單（若未指定 user_ids，取該 Bot 的所有關注者）
        try:
            from app.models.line_user import LineBotUser
            from app.services.conversation_service import ConversationService
            from app.services.websocket_manager import websocket_manager
            targets: List[str]
            if user_ids:
                targets = list(user_ids)
            else:
                def _list_targets():
                    return [
                        u.line_user_id for u in db.query(LineBotUser)
                        .filter(LineBotUser.bot_id == bot.id, LineBotUser.is_followed == True)
                        .all()
                    ]
                targets = await asyncio.to_thread(_list_targets)

            # 對每位用戶記錄 admin 訊息到 MongoDB
            for uid in targets:
                try:
                    added = await ConversationService.add_admin_message(
                        bot_id=bot_id,
                        line_user_id=uid,
                        admin_user=current_user,
                        message_content={"text": message},
                        message_type="text"
                    )
                    # 推送到 WebSocket，讓前端聊天室增量更新
                    try:
                        admin_user_info = added.admin_user.dict() if hasattr(added.admin_user, 'dict') else {
                            'id': getattr(added.admin_user, 'id', None),
                            'username': getattr(added.admin_user, 'username', None),
                            'full_name': getattr(added.admin_user, 'full_name', None)
                        }
                        await websocket_manager.broadcast_to_bot(bot_id, {
                            'type': 'chat_message',
                            'bot_id': bot_id,
                            'line_user_id': uid,
                            'data': {
                                'line_user_id': uid,
                                'message': {
                                    'id': added.id,
                                    'event_type': added.event_type,
                                    'message_type': added.message_type,
                                    'message_content': added.content,
                                    'sender_type': added.sender_type,
                                    'timestamp': added.timestamp.isoformat() if hasattr(added.timestamp, 'isoformat') else added.timestamp,
                                    'media_url': added.media_url,
                                    'media_path': added.media_path,
                                    'admin_user': admin_user_info
                                }
                            }
                        })
                    except Exception as ws_err:
                        logger.warning(f"推送 WebSocket 聊天消息失敗: user={uid}, err={ws_err}")
                except Exception as mongo_error:
                    logger.error(f"記錄廣播訊息到 MongoDB 失敗: user={uid}, err={mongo_error}")
        except Exception as log_err:
            logger.error(f"整理廣播目標或寫入對話失敗: {log_err}")

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
    bot = await asyncio.to_thread(lambda: db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first())
    
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
        result = await asyncio.to_thread(line_bot_service.send_message_to_user, line_user_id, message)
        
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
        await asyncio.to_thread(lambda: (db.add(admin_message), db.commit()))
        
        # 同時記錄到 MongoDB 聊天記錄並推送到 WebSocket（增量更新）
        try:
            from app.services.websocket_manager import websocket_manager
            added = await ConversationService.add_admin_message(
                bot_id=bot_id,
                line_user_id=line_user_id,
                admin_user=current_user,
                message_content={"text": message},  # 正確的格式
                message_type="text"
            )
            logger.info(f"管理者訊息已記錄到 MongoDB: bot_id={bot_id}, line_user_id={line_user_id}, admin_id={current_user.id}")
            try:
                admin_user_info = added.admin_user.dict() if hasattr(added.admin_user, 'dict') else {
                    'id': getattr(added.admin_user, 'id', None),
                    'username': getattr(added.admin_user, 'username', None),
                    'full_name': getattr(added.admin_user, 'full_name', None)
                }
                await websocket_manager.broadcast_to_bot(bot_id, {
                    'type': 'chat_message',
                    'bot_id': bot_id,
                    'line_user_id': line_user_id,
                    'data': {
                        'line_user_id': line_user_id,
                        'message': {
                            'id': added.id,
                            'event_type': added.event_type,
                            'message_type': added.message_type,
                            'message_content': added.content,
                            'sender_type': added.sender_type,
                            'timestamp': added.timestamp.isoformat() if hasattr(added.timestamp, 'isoformat') else added.timestamp,
                            'media_url': added.media_url,
                            'media_path': added.media_path,
                            'admin_user': admin_user_info
                        }
                    }
                })
            except Exception as ws_err:
                logger.warning(f"推送 WebSocket 聊天消息失敗: user={line_user_id}, err={ws_err}")
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
    bot = await asyncio.to_thread(lambda: db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first())
    
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
        result = await asyncio.to_thread(line_bot_service.broadcast_message, message, selected_user_ids)
        
        # 為每個選中的用戶記錄管理者發送的訊息（PostgreSQL + MongoDB）
        from app.services.conversation_service import ConversationService
        for line_user_id in selected_user_ids:
            # PostgreSQL 紀錄（保留既有行為）
            admin_message = AdminMessage(
                bot_id=bot_id,
                line_user_id=line_user_id,
                admin_user_id=current_user.id,
                message_content=message,
                message_type="text",
                sent_status="sent" if result.get("success") else "failed"
            )
            db.add(admin_message)
            # MongoDB 對話紀錄（新增）
            try:
                await ConversationService.add_admin_message(
                    bot_id=bot_id,
                    line_user_id=line_user_id,
                    admin_user=current_user,
                    message_content={"text": message},
                    message_type="text"
                )
            except Exception as mongo_error:
                logger.error(f"記錄選擇性廣播到 MongoDB 失敗: user={line_user_id}, err={mongo_error}")

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
    bot = await asyncio.to_thread(lambda: db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first())
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        from app.services.conversation_service import ConversationService
        
        # 使用 ConversationService 獲取聊天記錄
        chat_history, total_count = await ConversationService.get_chat_history(
            bot_id=bot_id,
            line_user_id=line_user_id,
            limit=limit,
            offset=offset,
            sender_type=sender_type
        )

        result = {
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

        return result
        
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
    bot = await asyncio.to_thread(lambda: db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first())

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
