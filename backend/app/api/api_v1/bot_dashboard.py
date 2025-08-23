"""
Bot 儀表板 API 路由
提供複合資料端點以優化效能
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.bot import Bot, LogicTemplate
from app.models.line_user import LineBotUser, LineBotUserInteraction
from app.services.line_bot_service import LineBotService
from app.config.redis_config import (
    CacheService, 
    CacheKeys, 
    cache_result, 
    CacheInvalidator,
    BOT_ANALYTICS_TTL,
    WEBHOOK_STATUS_TTL,
    DEFAULT_CACHE_TTL
)
from app.utils.query_optimizer import QueryOptimizer
from app.utils.pagination import LazyLoader, PaginationParams

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{bot_id}/dashboard")
@cache_result(
    key_generator=lambda bot_id, include_analytics, include_logic, include_webhook, period, db, current_user: 
        f"{CacheKeys.bot_dashboard(bot_id, current_user.id)}:{include_analytics}:{include_logic}:{include_webhook}:{period}",
    ttl=DEFAULT_CACHE_TTL,
    use_user_context=False
)
async def get_bot_dashboard(
    bot_id: str,
    include_analytics: bool = True,
    include_logic: bool = True,
    include_webhook: bool = True,
    period: Optional[str] = "week",  # day, week, month
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    獲取 Bot 儀表板所有資料
    
    這是一個複合端點，一次返回儀表板所需的所有資料，
    減少前端 API 請求數量，提升載入效能。
    
    Args:
        bot_id: Bot ID
        include_analytics: 是否包含分析資料
        include_logic: 是否包含邏輯模板
        include_webhook: 是否包含 webhook 狀態
        period: 分析週期 (day, week, month)
        db: 資料庫會話
        current_user: 當前使用者
    
    Returns:
        包含所有儀表板資料的複合回應
    """
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    dashboard_data = {
        "bot_info": {
            "id": bot.id,
            "name": bot.name,
            "created_at": bot.created_at.isoformat(),
            "updated_at": bot.updated_at.isoformat(),
            "is_configured": bool(bot.channel_token and bot.channel_secret)
        },
        "timestamp": datetime.now().isoformat()
    }
    
    # 並行獲取資料以提升效能
    try:
        # 基本統計資料（總是獲取，因為開銷小）
        total_users = db.query(LineBotUser).filter(LineBotUser.bot_id == bot_id).count()
        dashboard_data["basic_stats"] = {
            "total_users": total_users
        }
        
        # 獲取邏輯模板（優化查詢：選擇必要欄位並使用索引）
        if include_logic:
            logic_templates = db.query(LogicTemplate).filter(
                LogicTemplate.bot_id == bot_id
            ).order_by(LogicTemplate.created_at.desc()).all()
            
            dashboard_data["logic_templates"] = [
                {
                    "id": template.id,
                    "name": template.name,
                    "description": template.description,
                    "is_active": template.is_active,
                    "created_at": template.created_at.isoformat(),
                    "updated_at": template.updated_at.isoformat()
                }
                for template in logic_templates
            ]
        
        # 獲取分析資料
        if include_analytics:
            analytics_data = await _get_analytics_data(bot_id, period, db)
            dashboard_data["analytics"] = analytics_data
        
        # 獲取 Webhook 狀態
        if include_webhook:
            webhook_data = await _get_webhook_status(bot)
            dashboard_data["webhook_status"] = webhook_data
            
    except Exception as e:
        logger.error(f"獲取儀表板資料失敗: {str(e)}")
        # 即使部分資料獲取失敗，也返回已獲取的資料
        dashboard_data["error"] = f"部分資料獲取失敗: {str(e)}"
    
    return dashboard_data

@cache_result(
    key_generator=lambda bot_id, period, db: CacheKeys.bot_analytics(bot_id, period),
    ttl=BOT_ANALYTICS_TTL,
    use_user_context=False
)
async def _get_analytics_data(bot_id: str, period: str, db: Session) -> Dict[str, Any]:
    """獲取分析資料"""
    
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
    
    try:
        # 活躍使用者數（優化查詢：使用子查詢避免複雜 JOIN）
        active_user_subquery = db.query(LineBotUserInteraction.line_user_id).filter(
            LineBotUserInteraction.timestamp >= start_date,
            LineBotUserInteraction.timestamp <= end_date
        ).subquery()
        
        active_users = db.query(LineBotUser).filter(
            LineBotUser.bot_id == bot_id,
            LineBotUser.id.in_(db.query(active_user_subquery.c.line_user_id))
        ).count()
        
        # 總互動數（優化查詢：直接查詢互動表配合預建子查詢）
        bot_users_subquery = db.query(LineBotUser.id).filter(
            LineBotUser.bot_id == bot_id
        ).subquery()
        
        total_interactions = db.query(LineBotUserInteraction).filter(
            LineBotUserInteraction.line_user_id.in_(db.query(bot_users_subquery.c.id)),
            LineBotUserInteraction.timestamp >= start_date,
            LineBotUserInteraction.timestamp <= end_date
        ).count()
        
        # 今日互動數（重用子查詢）
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        today_interactions = db.query(LineBotUserInteraction).filter(
            LineBotUserInteraction.line_user_id.in_(db.query(bot_users_subquery.c.id)),
            LineBotUserInteraction.timestamp >= today_start,
            LineBotUserInteraction.timestamp < today_end
        ).count()
        
        # 本週互動數（重用子查詢）
        week_start = end_date - timedelta(days=7)
        week_interactions = db.query(LineBotUserInteraction).filter(
            LineBotUserInteraction.line_user_id.in_(db.query(bot_users_subquery.c.id)),
            LineBotUserInteraction.timestamp >= week_start,
            LineBotUserInteraction.timestamp <= end_date
        ).count()
        
        # 本月互動數（重用子查詢）
        month_start = end_date - timedelta(days=30)
        month_interactions = db.query(LineBotUserInteraction).filter(
            LineBotUserInteraction.line_user_id.in_(db.query(bot_users_subquery.c.id)),
            LineBotUserInteraction.timestamp >= month_start,
            LineBotUserInteraction.timestamp <= end_date
        ).count()
        
        # 使用者活動時段分佈（優化版本）
        activity_distribution = QueryOptimizer.get_activity_distribution_optimized(db, bot_id)
        
        return {
            "active_users": active_users,
            "total_interactions": total_interactions,
            "today_interactions": today_interactions,
            "week_interactions": week_interactions,
            "month_interactions": month_interactions,
            "activity_distribution": activity_distribution,
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"獲取分析資料失敗: {str(e)}")
        return {
            "error": f"分析資料獲取失敗: {str(e)}",
            "active_users": 0,
            "total_interactions": 0,
            "today_interactions": 0,
            "week_interactions": 0,
            "month_interactions": 0
        }

@cache_result(
    key_generator=lambda bot: CacheKeys.webhook_status(str(bot.id)),
    ttl=WEBHOOK_STATUS_TTL,
    use_user_context=False
)
async def _get_webhook_status(bot: Bot) -> Dict[str, Any]:
    """獲取 Webhook 狀態"""
    
    if not bot.channel_token or not bot.channel_secret:
        return {
            "status": "not_configured",
            "status_text": "未設定",
            "is_configured": False,
            "line_api_accessible": False,
            "webhook_working": False,
            "error": "Bot 未配置"
        }
    
    try:
        line_bot_service = LineBotService(bot.channel_token, bot.channel_secret)
        
        # 檢查 LINE API 連接
        line_api_accessible = line_bot_service.check_connection()
        
        # 檢查 Webhook 端點設定
        webhook_endpoint_info = line_bot_service.check_webhook_endpoint()
        webhook_working = (
            webhook_endpoint_info.get("is_set", False) and 
            webhook_endpoint_info.get("active", False)
        )
        
        # 判斷整體狀態
        if not line_api_accessible:
            status = "configuration_error"
            status_text = "設定錯誤"
        elif webhook_working:
            status = "active"
            status_text = "已綁定"
        else:
            status = "inactive"
            status_text = "未綁定"
        
        # 獲取 webhook 域名
        import os
        webhook_domain = os.getenv('WEBHOOK_DOMAIN', 'http://localhost:8000')
        
        return {
            "bot_id": str(bot.id),
            "bot_name": bot.name,
            "status": status,
            "status_text": status_text,
            "is_configured": True,
            "line_api_accessible": line_api_accessible,
            "webhook_working": webhook_working,
            "webhook_url": f"{webhook_domain}/api/v1/webhooks/{bot.id}",
            "webhook_endpoint_info": webhook_endpoint_info,
            "checked_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"獲取 Webhook 狀態失敗: {str(e)}")
        return {
            "status": "error",
            "status_text": "檢查失敗",
            "error": str(e),
            "checked_at": datetime.now().isoformat()
        }

@router.get("/{bot_id}/dashboard/light")
async def get_bot_dashboard_light(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    獲取輕量版儀表板資料
    
    只返回最基本的資訊，用於快速載入
    """
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    # 基本統計
    total_users = db.query(LineBotUser).filter(LineBotUser.bot_id == bot_id).count()
    
    # 今日互動數（快速查詢）
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # 優化查詢：使用子查詢避免 JOIN
    bot_user_ids = db.query(LineBotUser.id).filter(LineBotUser.bot_id == bot_id).subquery()
    
    today_interactions = db.query(LineBotUserInteraction).filter(
        LineBotUserInteraction.line_user_id.in_(db.query(bot_user_ids.c.id)),
        LineBotUserInteraction.timestamp >= today_start,
        LineBotUserInteraction.timestamp < today_end
    ).count()
    
    return {
        "bot_info": {
            "id": bot.id,
            "name": bot.name,
            "is_configured": bool(bot.channel_token and bot.channel_secret)
        },
        "basic_stats": {
            "total_users": total_users,
            "today_interactions": today_interactions
        },
        "timestamp": datetime.now().isoformat()
    }

@router.delete("/{bot_id}/cache")
async def clear_bot_cache(
    bot_id: str,
    cache_type: Optional[str] = None,  # analytics, webhook, logic, all
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """清除 Bot 快取"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        if cache_type == "analytics":
            await CacheService.invalidate_pattern(f"analytics:bot:{bot_id}:*")
            message = "分析資料快取已清除"
        elif cache_type == "webhook":
            await CacheInvalidator.invalidate_webhook_cache(bot_id)
            message = "Webhook 快取已清除"
        elif cache_type == "logic":
            await CacheService.delete(CacheKeys.logic_templates(bot_id))
            message = "邏輯模板快取已清除"
        elif cache_type == "all" or cache_type is None:
            await CacheInvalidator.invalidate_bot_cache(bot_id, str(current_user.id))
            message = "所有 Bot 快取已清除"
        else:
            raise HTTPException(status_code=400, detail="無效的快取類型")
        
        return {
            "success": True,
            "message": message,
            "bot_id": bot_id,
            "cache_type": cache_type or "all",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"清除快取失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"清除快取失敗: {str(e)}")

# 新增分頁端點

@router.get("/{bot_id}/users")
async def get_bot_users_paginated(
    bot_id: str,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """分頁獲取 Bot 用戶列表"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        result = LazyLoader.paginate_bot_users(
            db=db,
            bot_id=bot_id,
            page=page,
            limit=limit,
            search=search,
            active_only=active_only
        )
        
        # 轉換項目為字典格式
        result["items"] = [
            {
                "id": str(user.id),
                "line_user_id": user.line_user_id,
                "display_name": user.display_name,
                "picture_url": user.picture_url,
                "is_followed": user.is_followed,
                "first_interaction": user.first_interaction.isoformat() if user.first_interaction else None,
                "last_interaction": user.last_interaction.isoformat() if user.last_interaction else None,
                "interaction_count": user.interaction_count,
            }
            for user in result["items"]
        ]
        
        return result
        
    except Exception as e:
        logger.error(f"獲取用戶列表失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取用戶列表失敗: {str(e)}")

@router.get("/{bot_id}/interactions")
async def get_bot_interactions_paginated(
    bot_id: str,
    page: int = 1,
    limit: int = 50,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """分頁獲取 Bot 互動記錄"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        result = LazyLoader.paginate_interactions(
            db=db,
            bot_id=bot_id,
            page=page,
            limit=limit,
            event_type=event_type
        )
        
        # 轉換項目為字典格式
        result["items"] = [
            {
                "id": str(interaction.id),
                "event_type": interaction.event_type,
                "message_type": interaction.message_type,
                "message_content": interaction.message_content,
                "timestamp": interaction.timestamp.isoformat(),
                "user": {
                    "line_user_id": interaction.line_bot_user.line_user_id,
                    "display_name": interaction.line_bot_user.display_name
                } if interaction.line_bot_user else None
            }
            for interaction in result["items"]
        ]
        
        return result
        
    except Exception as e:
        logger.error(f"獲取互動記錄失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取互動記錄失敗: {str(e)}")

@router.get("/{bot_id}/templates")
async def get_logic_templates_paginated(
    bot_id: str,
    page: int = 1,
    limit: int = 10,
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """分頁獲取邏輯模板"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        result = LazyLoader.paginate_logic_templates(
            db=db,
            bot_id=bot_id,
            page=page,
            limit=limit,
            active_only=active_only
        )
        
        # 轉換項目為字典格式
        result["items"] = [
            {
                "id": str(template.id),
                "name": template.name,
                "description": template.description,
                "is_active": template.is_active == "true",
                "created_at": template.created_at.isoformat(),
                "updated_at": template.updated_at.isoformat()
            }
            for template in result["items"]
        ]
        
        return result
        
    except Exception as e:
        logger.error(f"獲取邏輯模板失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取邏輯模板失敗: {str(e)}")

@router.get("/{bot_id}/summary")
async def get_bot_summary(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """獲取 Bot 概要統計（用於首次快速載入）"""
    
    # 驗證 Bot 所有權
    bot = db.query(Bot).filter(
        Bot.id == bot_id,
        Bot.user_id == current_user.id
    ).first()
    
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")
    
    try:
        stats = LazyLoader.get_summary_stats(db, bot_id)
        
        return {
            "bot_info": {
                "id": bot.id,
                "name": bot.name,
                "is_configured": bool(bot.channel_token and bot.channel_secret)
            },
            "summary_stats": stats
        }
        
    except Exception as e:
        logger.error(f"獲取概要統計失敗: {str(e)}")
        raise HTTPException(status_code=500, detail=f"獲取概要統計失敗: {str(e)}")