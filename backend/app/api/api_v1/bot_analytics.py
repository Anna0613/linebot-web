"""
LINE Bot 分析 API 路由
提供 Bot 數據分析、統計和監控功能
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict, List, Optional
from datetime import date, datetime, timedelta
import json
import logging
import asyncio

from app.db.database_async import get_async_db
from app.dependencies import get_current_user_async, get_db_primary
from app.models.user import User
from app.models.bot import Bot
from app.models.line_user import LineBotUser
from app.services.line.line_bot_service import LineBotService
from sqlalchemy import select, func

logger = logging.getLogger(__name__)

router = APIRouter()


def _line_yesterday_jst() -> date:
    """LINE Insight date parameters are based on UTC+9."""
    return (datetime.utcnow() + timedelta(hours=9) - timedelta(days=1)).date()


def _line_date(value: date) -> str:
    return value.strftime("%Y%m%d")


def _period_days(period: Optional[str]) -> int:
    if period == "day":
        return 1
    if period == "month":
        return 30
    return 7


def _insight_dates(days: int) -> List[date]:
    days = max(1, min(int(days or 7), 30))
    end = _line_yesterday_jst()
    start = end - timedelta(days=days - 1)
    return [start + timedelta(days=index) for index in range(days)]


def _safe_number(value: Any) -> float:
    if isinstance(value, bool):
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return 0.0
    return 0.0


def _sum_numeric_values(value: Any) -> int:
    if isinstance(value, dict):
        return int(sum(_sum_numeric_values(v) for k, v in value.items() if k not in {"status_code"}))
    if isinstance(value, list):
        return int(sum(_sum_numeric_values(item) for item in value))
    return int(_safe_number(value))


def _extract_delivery_count(data: Dict[str, Any]) -> int:
    if not data or data.get("status") in {"error", "unavailable"}:
        return 0
    # LINE Insight responses contain numeric delivery fields. Sum only the
    # returned counters so the page stays fully LINE-backed without local data.
    return _sum_numeric_values({k: v for k, v in data.items() if k not in {"status", "error"}})


def _extract_followers(data: Dict[str, Any]) -> int:
    for key in ("followers", "follower", "followersCount"):
        if key in data:
            return int(_safe_number(data.get(key)))
    return 0


def _extract_targeted_reaches(data: Dict[str, Any]) -> int:
    for key in ("targetedReaches", "targetedReach", "reachableFollowers"):
        if key in data:
            return int(_safe_number(data.get(key)))
    return 0


def _format_demographic_label(field: str, item: Dict[str, Any]) -> str:
    raw = (
        item.get("gender")
        or item.get("age")
        or item.get("area")
        or item.get("appType")
        or item.get("subscriptionPeriod")
        or item.get("label")
        or "unknown"
    )
    mappings = {
        "male": "男性",
        "female": "女性",
        "unknown": "未知",
        "from0to14": "0-14 歲",
        "from15to19": "15-19 歲",
        "from20to24": "20-24 歲",
        "from25to29": "25-29 歲",
        "from30to34": "30-34 歲",
        "from35to39": "35-39 歲",
        "from40to44": "40-44 歲",
        "from45to49": "45-49 歲",
        "from50": "50 歲以上",
    }
    prefix = {
        "genders": "性別",
        "ages": "年齡",
        "areas": "地區",
        "appTypes": "裝置",
        "subscriptionPeriods": "加入期間",
    }.get(field, "分布")
    return f"{prefix}: {mappings.get(str(raw), str(raw))}"


async def _get_owned_bot(db: AsyncSession, bot_id: str, user_id) -> Bot:
    result = await db.execute(select(Bot).where(Bot.id == bot_id, Bot.user_id == user_id))
    bot = result.scalars().first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    if not bot.channel_token or not bot.channel_secret:
        raise HTTPException(status_code=400, detail="Bot 尚未配置 Channel Token 或 Channel Secret")
    return bot


async def _line_delivery_series(line_bot_service: LineBotService, days: int) -> List[Dict[str, Any]]:
    dates = _insight_dates(days)
    semaphore = asyncio.Semaphore(3)

    async def fetch_day(day: date) -> Dict[str, Any]:
        async with semaphore:
            data = await line_bot_service.get_message_delivery_insight(_line_date(day))
            return {
                "date": day.isoformat(),
                "sent": _extract_delivery_count(data),
                "received": 0,
                "line_status": data.get("status"),
                "source": "line_insight",
            }

    return await asyncio.gather(*(fetch_day(day) for day in dates))


async def sync_users_from_line_api(db: AsyncSession, bot: Bot, line_user_ids: List[str], conversations: List[Dict]) -> List:
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
                    db.add(user_record)
                    await db.commit()
                    await db.refresh(user_record)
                    

                    synced_users.append(user_record)

                except Exception as e:
                    logger.error(f"同步用戶 {line_user_id} 失敗: {e}")
                    await db.rollback()
                    continue

    except Exception as e:
        logger.error(f"LINE API 初始化失敗: {e}")
        await db.rollback()
        raise

    return synced_users

@router.get("/{bot_id}/analytics")
async def get_bot_analytics(
    bot_id: str,
    period: Optional[str] = "week",  # day, week, month
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """獲取 Bot 分析數據（全部來自 LINE Insight API）"""
    try:
        bot = await _get_owned_bot(db, bot_id, current_user.id)
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        days = _period_days(period)
        series = await _line_delivery_series(line_bot_service, days)

        latest_date = _line_date(_line_yesterday_jst())
        followers_data = await line_bot_service.get_followers_insight(latest_date)
        followers = _extract_followers(followers_data)
        targeted_reaches = _extract_targeted_reaches(followers_data)
        reach_rate = (targeted_reaches / followers * 100) if followers else 0.0

        total_messages = sum(item["sent"] for item in series)

        return {
            "totalMessages": total_messages,
            "activeUsers": targeted_reaches or followers,
            "userRetention": round(reach_rate, 2),
            "todayMessages": series[-1]["sent"] if series else 0,
            "weekMessages": sum(item["sent"] for item in series[-7:]),
            "monthMessages": total_messages,
            "period": period,
            "startDate": series[0]["date"] if series else None,
            "endDate": series[-1]["date"] if series else None,
            "source": "line_insight",
            "lineFollowers": followers,
            "lineTargetedReaches": targeted_reaches,
            "lineFollowersStatus": followers_data.get("status"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"獲取分析數據失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取分析數據失敗: {str(e)}")

@router.get("/{bot_id}/messages/stats")
async def get_message_stats(
    bot_id: str,
    days: Optional[int] = 7,
    granularity: Optional[str] = "day",  # 新增：時間粒度參數 (hour, day, month)
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """獲取訊息統計數據（全部來自 LINE Insight API）

    Args:
        bot_id: Bot ID
        days: 統計天數
        granularity: 時間粒度 (hour, day, month)
    """

    try:
        bot = await _get_owned_bot(db, bot_id, current_user.id)
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        return await _line_delivery_series(line_bot_service, days or 7)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"獲取訊息統計失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取訊息統計失敗: {str(e)}")

@router.get("/{bot_id}/users/activity")
async def get_user_activity(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """獲取用戶活躍度數據。

    LINE Insight 不提供管理頁原本需要的每小時活躍用戶資料；為避免混用本地
    ConversationService，此端點回傳空陣列。
    """
    try:
        await _get_owned_bot(db, bot_id, current_user.id)
        return []

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"獲取用戶活躍度失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取用戶活躍度失敗: {str(e)}")

@router.get("/{bot_id}/usage/stats")
async def get_usage_stats(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """獲取 LINE Insight 人口統計分布，供管理頁圖表使用。"""
    try:
        bot = await _get_owned_bot(db, bot_id, current_user.id)
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        demographic = await line_bot_service.get_demographic_insight()

        if not demographic.get("available", True):
            return []

        items: List[Dict[str, Any]] = []
        for field in ("genders", "ages", "areas", "appTypes", "subscriptionPeriods"):
            values = demographic.get(field) or []
            if not isinstance(values, list):
                continue
            for value in values[:6]:
                if not isinstance(value, dict):
                    continue
                percentage = _safe_number(value.get("percentage"))
                if percentage <= 0:
                    continue
                items.append(
                    {
                        "feature": _format_demographic_label(field, value),
                        "usage": percentage,
                        "percentage": percentage,
                        "source": "line_insight_demographic",
                    }
                )

        return items[:12]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"獲取使用統計失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取使用統計失敗: {str(e)}")

@router.get("/{bot_id}/users")
async def get_bot_users(
    bot_id: str,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db_primary),
    current_user: User = Depends(get_current_user_async)
):
    """獲取 Bot 的用戶列表（本系統資料庫 line_bot_users）"""

    try:
        result = await db.execute(select(Bot).where(Bot.id == bot_id, Bot.user_id == current_user.id))
        bot = result.scalars().first()
        if not bot:
            raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")

        limit = max(1, min(int(limit or 50), 100))
        offset = max(0, int(offset or 0))

        res_cnt = await db.execute(
            select(func.count()).select_from(LineBotUser).where(LineBotUser.bot_id == bot_id)
        )
        total_count = res_cnt.scalar() or 0

        res_users = await db.execute(
            select(LineBotUser)
            .where(LineBotUser.bot_id == bot_id)
            .order_by(LineBotUser.last_interaction.desc())
            .offset(offset)
            .limit(limit)
        )
        users = res_users.scalars().all()

        user_list = [
            {
                "id": str(user.id),
                "line_user_id": user.line_user_id,
                "display_name": user.display_name or "未設定名稱",
                "picture_url": user.picture_url or "",
                "status_message": user.status_message or "",
                "language": user.language or "",
                "first_interaction": user.first_interaction.isoformat() if user.first_interaction else "",
                "last_interaction": user.last_interaction.isoformat() if user.last_interaction else "",
                "interaction_count": user.interaction_count or "0",
                "is_followed": user.is_followed,
                "source": "system_database",
            }
            for user in users
        ]

        return {
            "bot_id": bot_id,
            "users": user_list,
            "total_count": total_count,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "has_next": offset + len(user_list) < total_count,
                "has_prev": offset > 0,
                "has_more": offset + len(user_list) < total_count,
                "total": total_count,
            },
            "source": "system_database",
            "error": None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"獲取用戶列表失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取用戶列表失敗: {str(e)}")

@router.get("/{bot_id}/users/{line_user_id}/interactions")
async def get_user_interactions(
    bot_id: str,
    line_user_id: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """獲取特定用戶的互動歷史（使用 MongoDB）"""

    # 驗證 Bot 所有權
    result = await db.execute(select(Bot).where(Bot.id == bot_id, Bot.user_id == current_user.id))
    bot = result.scalars().first()

    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")

    try:
        from app.services.conversation.conversation_service import ConversationService

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
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """廣播訊息給所有關注者"""
    
    # 驗證 Bot 所有權
    result = await db.execute(select(Bot).where(Bot.id == bot_id, Bot.user_id == current_user.id))
    bot = result.scalars().first()
    
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
            from app.services.conversation.conversation_service import ConversationService
            from app.services.realtime.websocket_manager import websocket_manager
            targets: List[str]
            if user_ids:
                targets = list(user_ids)
            else:
                res_targets = await db.execute(select(LineBotUser.line_user_id).where(LineBotUser.bot_id == bot.id, LineBotUser.is_followed == True))
                targets = [row[0] for row in res_targets.all()]

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
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """發送訊息給特定用戶（使用 MongoDB 儲存聊天記錄）"""
    
    # 驗證 Bot 所有權
    result = await db.execute(select(Bot).where(Bot.id == bot_id, Bot.user_id == current_user.id))
    bot = result.scalars().first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        from app.models.line_user import AdminMessage
        from app.services.conversation.conversation_service import ConversationService
        
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
        db.add(admin_message)
        await db.commit()
        
        # 同時記錄到 MongoDB 聊天記錄並推送到 WebSocket（增量更新）
        try:
            from app.services.realtime.websocket_manager import websocket_manager
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
        await db.rollback()
        logger.error(f"發送訊息失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"發送訊息失敗: {str(e)}")

@router.post("/{bot_id}/broadcast/selective")
async def selective_broadcast_message(
    bot_id: str,
    message_data: Dict,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """選擇性廣播訊息給指定用戶"""
    
    # 驗證 Bot 所有權
    result = await db.execute(select(Bot).where(Bot.id == bot_id, Bot.user_id == current_user.id))
    bot = result.scalars().first()
    
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
        from app.services.conversation.conversation_service import ConversationService
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
            await db.commit()
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
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """獲取用戶與管理者的聊天記錄（使用 MongoDB）"""
    
    # 驗證 Bot 所有權
    result = await db.execute(select(Bot).where(Bot.id == bot_id, Bot.user_id == current_user.id))
    bot = result.scalars().first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        from app.services.conversation.conversation_service import ConversationService
        
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
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """獲取 Bot 活動記錄（由 LINE Insight 快照產生，不讀取本地對話資料）"""

    try:
        bot = await _get_owned_bot(db, bot_id, current_user.id)
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        series = await _line_delivery_series(line_bot_service, min(max(limit + offset, 1), 7))
        sliced = series[offset: offset + limit]

        activities = [
            {
                "id": f"line_insight_delivery_{item['date']}",
                "interaction_type": "message",
                "message_content": f"LINE Insight 送達訊息 {item['sent']} 則",
                "timestamp": f"{item['date']}T00:00:00+09:00",
                "display_name": "LINE Insight",
                "source": "line_insight",
            }
            for item in reversed(sliced)
        ]

        return {
            "activities": activities,
            "total_count": len(series),
            "has_more": offset + limit < len(series),
            "source": "line_insight",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"獲取活動記錄失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取活動記錄失敗: {str(e)}")


@router.get("/{bot_id}/quota")
async def get_bot_quota_status(
    bot_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """
    取得 Bot 的訊息配額狀態

    Returns:
        {
            "bot_id": str,
            "bot_name": str,
            "quota_status": {
                "quota_type": "limited" | "none" | "unknown",
                "quota_limit": int | None,
                "quota_used": int,
                "quota_remaining": int | None,
                "usage_percentage": float,
                "is_near_limit": bool,
                "is_exceeded": bool,
                "last_updated": str
            },
            "timestamp": str
        }
    """
    # 驗證 Bot 所有權
    result = await db.execute(
        select(Bot).where(Bot.id == bot_id, Bot.user_id == current_user.id)
    )
    bot = result.scalars().first()

    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")

    # 檢查 Bot 是否已配置
    if not bot.channel_token or not bot.channel_secret:
        return {
            "bot_id": bot_id,
            "bot_name": bot.name,
            "quota_status": {
                "error": "Bot 尚未配置 Channel Token",
                "quota_type": "unknown",
                "quota_limit": None,
                "quota_used": 0,
                "quota_remaining": None,
                "usage_percentage": 0.0,
                "is_near_limit": False,
                "is_exceeded": False,
                "last_updated": datetime.now().isoformat()
            },
            "timestamp": datetime.now().isoformat()
        }

    try:
        # 取得配額狀態
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        quota_status = await line_bot_service.get_quota_status()

        logger.info(f"成功取得 Bot {bot_id} 的配額狀態: {quota_status}")

        return {
            "bot_id": bot_id,
            "bot_name": bot.name,
            "quota_status": quota_status,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"取得 Bot 配額狀態失敗: {str(e)}")
        # 返回錯誤狀態而不是拋出異常，讓前端可以正常顯示
        return {
            "bot_id": bot_id,
            "bot_name": bot.name,
            "quota_status": {
                "error": f"取得配額狀態失敗: {str(e)}",
                "quota_type": "unknown",
                "quota_limit": None,
                "quota_used": 0,
                "quota_remaining": None,
                "usage_percentage": 0.0,
                "is_near_limit": False,
                "is_exceeded": False,
                "last_updated": datetime.now().isoformat()
            },
            "timestamp": datetime.now().isoformat()
        }
