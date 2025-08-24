"""
Bot 儀表板 API 路由
提供複合資料端點以優化效能
"""
import asyncio
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
    BOT_DASHBOARD_TTL,
    DEFAULT_CACHE_TTL
)
from app.services.cache_service import get_cache, cache_async
from app.utils.query_optimizer import QueryOptimizer
from app.utils.pagination import LazyLoader, PaginationParams

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{bot_id}/dashboard")
@cache_result(
    key_generator=lambda bot_id, include_analytics, include_logic, include_webhook, period, db, current_user: 
        f"{CacheKeys.bot_dashboard(bot_id, current_user.id)}:{include_analytics}:{include_logic}:{include_webhook}:{period}",
    ttl=BOT_DASHBOARD_TTL,  # 使用更長的快取時間：20分鐘
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
    
    # 並行獲取資料以提升效能 - 優化版本
    try:
        # 建立並行任務列表
        parallel_tasks = []
        
        # 基本統計資料（總是獲取，因為開銷小）
        async def get_basic_stats():
            # 使用異步方式執行同步查詢
            import asyncio
            loop = asyncio.get_event_loop()
            total_users = await loop.run_in_executor(
                None, 
                lambda: db.query(LineBotUser).filter(LineBotUser.bot_id == bot_id).count()
            )
            return {"total_users": total_users}
        
        # 邏輯模板查詢
        async def get_logic_templates():
            if not include_logic:
                return None
                
            loop = asyncio.get_event_loop()
            logic_templates = await loop.run_in_executor(
                None,
                lambda: db.query(
                    LogicTemplate.id,
                    LogicTemplate.name,
                    LogicTemplate.description,
                    LogicTemplate.is_active,
                    LogicTemplate.created_at,
                    LogicTemplate.updated_at
                ).filter(
                    LogicTemplate.bot_id == bot_id
                ).order_by(
                    LogicTemplate.is_active.desc(),
                    LogicTemplate.updated_at.desc()
                ).all()
            )
            
            return [
                {
                    "id": str(template.id),
                    "name": template.name,
                    "description": template.description,
                    "is_active": template.is_active,
                    "created_at": template.created_at.isoformat(),
                    "updated_at": template.updated_at.isoformat()
                }
                for template in logic_templates
            ]
        
        # 建立並行任務
        tasks = {
            "basic_stats": get_basic_stats(),
            "logic_templates": get_logic_templates() if include_logic else None,
            "analytics": _get_analytics_data(bot_id, period, db) if include_analytics else None,
            "webhook_status": _get_webhook_status(bot) if include_webhook else None
        }
        
        # 過濾掉 None 的任務
        active_tasks = {k: v for k, v in tasks.items() if v is not None}
        
        # 並行執行所有任務
        results = await asyncio.gather(*active_tasks.values(), return_exceptions=True)
        
        # 將結果對應回原始鍵
        for i, (key, _) in enumerate(active_tasks.items()):
            result = results[i]
            if isinstance(result, Exception):
                logger.error(f"並行任務 {key} 執行失敗: {result}")
                # 設定預設值
                if key == "basic_stats":
                    dashboard_data[key] = {"total_users": 0}
                elif key == "logic_templates":
                    dashboard_data[key] = []
                elif key == "analytics":
                    dashboard_data[key] = {"error": str(result)}
                elif key == "webhook_status":
                    dashboard_data[key] = {"error": str(result)}
            else:
                if key == "logic_templates" and result is not None:
                    dashboard_data[key] = result
                elif key != "logic_templates":
                    dashboard_data[key] = result
            
    except Exception as e:
        logger.error(f"獲取儀表板資料失敗: {str(e)}")
        # 即使部分資料獲取失敗，也返回已獲取的資料
        dashboard_data["error"] = f"部分資料獲取失敗: {str(e)}"
    
    return dashboard_data

@cache_async(
    key_prefix="analytics",
    ttl=BOT_ANALYTICS_TTL,
    l1_ttl=300,   # L1 快取 5 分鐘
    l2_ttl=900,   # L2 快取 15 分鐘
    use_args_in_key=True
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
        # 使用單一聯合查詢獲取所有統計數據 - 大幅提升效能
        from sqlalchemy import text, func
        
        # 構建高效的聯合查詢
        analytics_query = text("""
        WITH bot_user_ids AS (
            SELECT id FROM line_bot_users WHERE bot_id = :bot_id
        ),
        time_ranges AS (
            SELECT 
                :period_start::timestamp as period_start,
                :period_end::timestamp as period_end,
                :today_start::timestamp as today_start,
                :today_end::timestamp as today_end,
                :week_start::timestamp as week_start,
                :month_start::timestamp as month_start
        ),
        interaction_stats AS (
            SELECT
                COUNT(*) FILTER (WHERE timestamp BETWEEN :period_start AND :period_end) as period_interactions,
                COUNT(*) FILTER (WHERE timestamp BETWEEN :today_start AND :today_end) as today_interactions,
                COUNT(*) FILTER (WHERE timestamp BETWEEN :week_start AND :period_end) as week_interactions,
                COUNT(*) FILTER (WHERE timestamp BETWEEN :month_start AND :period_end) as month_interactions,
                COUNT(DISTINCT line_user_id) FILTER (WHERE timestamp BETWEEN :period_start AND :period_end) as active_users
            FROM line_bot_user_interactions 
            WHERE line_user_id IN (SELECT id FROM bot_user_ids)
        )
        SELECT * FROM interaction_stats;
        """)
        
        # 計算時間範圍
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        week_start = end_date - timedelta(days=7)
        month_start = end_date - timedelta(days=30)
        
        # 執行聯合查詢
        result = db.execute(analytics_query, {
            'bot_id': bot_id,
            'period_start': start_date,
            'period_end': end_date,
            'today_start': today_start,
            'today_end': today_end,
            'week_start': week_start,
            'month_start': month_start
        }).fetchone()
        
        if result:
            active_users = result.active_users or 0
            total_interactions = result.period_interactions or 0
            today_interactions = result.today_interactions or 0
            week_interactions = result.week_interactions or 0
            month_interactions = result.month_interactions or 0
        else:
            # 降級方案：如果聯合查詢失敗，使用原來的方法
            active_users = 0
            total_interactions = 0
            today_interactions = 0
            week_interactions = 0
            month_interactions = 0
        
        # 使用者活動時段分佈（簡化版本以提升效能）
        activity_query = text("""
        SELECT 
            EXTRACT(hour FROM timestamp) as hour,
            COUNT(*) as count
        FROM line_bot_user_interactions lbui
        JOIN line_bot_users lbu ON lbui.line_user_id = lbu.id
        WHERE lbu.bot_id = :bot_id 
        AND timestamp >= :start_date 
        AND timestamp <= :end_date
        GROUP BY EXTRACT(hour FROM timestamp)
        ORDER BY hour;
        """)
        
        activity_result = db.execute(activity_query, {
            'bot_id': bot_id,
            'start_date': start_date,
            'end_date': end_date
        }).fetchall()
        
        activity_distribution = [
            {"hour": f"{int(row.hour):02d}:00", "activeUsers": row.count}
            for row in activity_result
        ]
        
        return {
            "active_users": active_users,
            "total_interactions": total_interactions,
            "today_interactions": today_interactions,
            "week_interactions": week_interactions,
            "month_interactions": month_interactions,
            "activity_distribution": activity_distribution,
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            # 額外的統計數據用於前端顯示
            "response_time": 0.8,  # 模擬數據，實際可以從監控系統獲取
            "success_rate": 95.5,  # 模擬數據，實際可以從日誌分析獲取
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

@cache_async(
    key_prefix="webhook_status",
    ttl=WEBHOOK_STATUS_TTL,
    l1_ttl=180,    # L1 快取 3 分鐘 (webhook 狀態變化較快)
    l2_ttl=600,    # L2 快取 10 分鐘
    use_args_in_key=False  # 使用 bot_id 作為唯一鍵
)
async def _get_webhook_status(bot: Bot) -> Dict[str, Any]:
    """獲取 Webhook 狀態 - 使用異步並行處理"""
    
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
        
        # 使用 asyncio.gather 並行執行 API 檢查 - 效能優化
        check_tasks = [
            line_bot_service.async_check_connection(),
            line_bot_service.async_get_bot_info(),
            line_bot_service.async_check_webhook_endpoint()
        ]
        
        # 並行執行所有檢查，顯著提升效能
        line_api_accessible, bot_info, webhook_endpoint_info = await asyncio.gather(
            *check_tasks, return_exceptions=True
        )
        
        # 處理異常結果
        if isinstance(line_api_accessible, Exception):
            logger.error(f"檢查連接失敗: {line_api_accessible}")
            line_api_accessible = False
        
        if isinstance(bot_info, Exception):
            logger.error(f"獲取Bot資訊失敗: {bot_info}")
            bot_info = None
        
        if isinstance(webhook_endpoint_info, Exception):
            logger.error(f"檢查Webhook失敗: {webhook_endpoint_info}")
            webhook_endpoint_info = {"is_set": False, "active": False, "error": str(webhook_endpoint_info)}
        
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
        
        result = {
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
        
        # 如果成功獲取 Bot 資訊，添加 channel_id
        if bot_info and bot_info.get("channel_id"):
            result["channel_id"] = bot_info["channel_id"]
            logger.info(f"Bot {bot.id} - 異步獲取到 Channel ID: {bot_info['channel_id']}")
        else:
            logger.warning(f"Bot {bot.id} - 未能異步獲取到 Channel ID, bot_info: {bot_info}")
        
        return result
        
    except Exception as e:
        logger.error(f"異步獲取 Webhook 狀態失敗: {str(e)}")
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