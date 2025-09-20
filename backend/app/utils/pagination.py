"""
分頁工具和懶加載機制（Async 版本）
僅保留 AsyncSession 相關方法，移除同步 Session 版本以避免阻塞。
"""
from typing import Dict, List, Any, Optional, TypeVar, Generic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from pydantic import BaseModel, Field

T = TypeVar('T')

class PaginationParams(BaseModel):
    """分頁參數"""
    page: int = Field(default=1, ge=1, description="頁碼，從1開始")
    limit: int = Field(default=20, ge=1, le=100, description="每頁項目數，最大100")
    sort_by: Optional[str] = Field(default=None, description="排序欄位")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$", description="排序方式")

class PaginatedResponse(BaseModel, Generic[T]):
    """分頁回應模型"""
    items: List[T]
    total: int
    page: int
    limit: int
    pages: int
    has_next: bool
    has_prev: bool
    next_page: Optional[int] = None
    prev_page: Optional[int] = None

class LazyLoader:
    """懶加載工具（Async）"""

    @staticmethod
    async def paginate_bot_users_async(
        db: AsyncSession,
        bot_id: str,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        active_only: bool = False,
    ) -> Dict[str, Any]:
        from app.models.line_user import LineBotUser
        offset = (page - 1) * limit
        # total
        total_res = await db.execute(
            select(func.count()).select_from(LineBotUser).where(LineBotUser.bot_id == bot_id)
        )
        total = total_res.scalar() or 0
        # base stmt
        stmt = select(LineBotUser).where(LineBotUser.bot_id == bot_id)
        if search:
            search_pattern = f"%{search}%"
            stmt = stmt.where(
                LineBotUser.display_name.ilike(search_pattern) | LineBotUser.line_user_id.ilike(search_pattern)
            )
        if active_only:
            stmt = stmt.where(LineBotUser.is_followed == True)
        stmt = stmt.order_by(LineBotUser.last_interaction.desc()).offset(offset).limit(limit)
        res = await db.execute(stmt)
        items = res.scalars().all()
        pages = (total + limit - 1) // limit if total else 0
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
            "next_page": page + 1 if page < pages else None,
            "prev_page": page - 1 if page > 1 else None,
        }
    
    @staticmethod
    async def paginate_interactions(
        bot_id: str,
        page: int = 1,
        limit: int = 50,
        event_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        分頁獲取互動記錄（使用 MongoDB）

        Args:
            bot_id: Bot ID
            page: 頁碼
            limit: 每頁項目數
            event_type: 事件類型過濾
        """
        from app.services.conversation_service import ConversationService

        offset = (page - 1) * limit

        # 使用 ConversationService 獲取活動記錄
        activities = await ConversationService.get_bot_activities(bot_id, limit, offset)

        # 如果需要事件類型過濾，在這裡進行
        if event_type:
            activities = [activity for activity in activities if activity.get("metadata", {}).get("eventType") == event_type]

        return {
            "items": activities,
            "total": len(activities),  # 這是一個簡化的實現
            "page": page,
            "limit": limit,
            "has_next": len(activities) == limit,
            "has_prev": page > 1
        }
    
    # 同步版本已移除（請使用 async 方法）

    @staticmethod
    async def paginate_logic_templates_async(
        db: AsyncSession,
        bot_id: str,
        page: int = 1,
        limit: int = 10,
        active_only: bool = False,
    ) -> Dict[str, Any]:
        from app.models.bot import LogicTemplate
        offset = (page - 1) * limit
        base = select(LogicTemplate).where(LogicTemplate.bot_id == bot_id)
        if active_only:
            base = base.where(LogicTemplate.is_active == "true")
        # total
        total_res = await db.execute(
            select(func.count()).select_from(LogicTemplate).where(LogicTemplate.bot_id == bot_id)
        )
        total = total_res.scalar() or 0
        stmt = base.order_by(LogicTemplate.updated_at.desc()).offset(offset).limit(limit)
        res = await db.execute(stmt)
        items = res.scalars().all()
        pages = (total + limit - 1) // limit if total else 0
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
            "next_page": page + 1 if page < pages else None,
            "prev_page": page - 1 if page > 1 else None,
        }

    @staticmethod
    async def get_summary_stats_async(db: AsyncSession, bot_id: str) -> Dict[str, Any]:
        from app.models.line_user import LineBotUser
        from app.models.bot import LogicTemplate
        from datetime import datetime
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        from sqlalchemy import text
        stats_query = text(
            """
            SELECT 
                COUNT(DISTINCT lbu.id) as total_users,
                COUNT(DISTINCT CASE WHEN lbu.is_followed = true THEN lbu.id END) as active_users,
                COUNT(DISTINCT CASE WHEN lbui.timestamp >= :today_start THEN lbui.id END) as today_interactions,
                COUNT(DISTINCT CASE WHEN lbui.timestamp >= :today_start THEN lbu.id END) as today_active_users,
                COUNT(DISTINCT lt.id) as total_templates,
                COUNT(DISTINCT CASE WHEN lt.is_active = 'true' THEN lt.id END) as active_templates
            FROM line_bot_users lbu
            LEFT JOIN line_bot_user_interactions lbui ON lbu.id = lbui.line_user_id
            LEFT JOIN logic_templates lt ON lt.bot_id = lbu.bot_id
            WHERE lbu.bot_id = :bot_id
            """
        )
        result = (await db.execute(stats_query, {"bot_id": bot_id, "today_start": today_start})).fetchone()
        if result:
            return {
                "total_users": result.total_users or 0,
                "active_users": result.active_users or 0,
                "today_interactions": result.today_interactions or 0,
                "today_active_users": result.today_active_users or 0,
                "total_templates": result.total_templates or 0,
                "active_templates": result.active_templates or 0,
                "generated_at": datetime.now().isoformat(),
            }
        return {
            "total_users": 0,
            "active_users": 0,
            "today_interactions": 0,
            "today_active_users": 0,
            "total_templates": 0,
            "active_templates": 0,
            "generated_at": datetime.now().isoformat(),
        }
    
    # 同步 summary 已移除（請使用 get_summary_stats_async）
