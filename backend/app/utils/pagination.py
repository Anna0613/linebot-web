"""
分頁工具和懶加載機制
提供高效的資料分頁和懶加載支援
"""
from typing import Dict, List, Any, Optional, TypeVar, Generic
from sqlalchemy.orm import Session, Query
from sqlalchemy import func, desc, asc
from pydantic import BaseModel, Field
import math

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
    """懶加載工具"""
    
    @staticmethod
    def paginate_query(
        db: Session,
        query: Query,
        page: int = 1,
        limit: int = 20,
        sort_column=None,
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """
        對查詢進行分頁處理
        
        Args:
            db: 資料庫會話
            query: SQLAlchemy 查詢物件
            page: 頁碼
            limit: 每頁項目數
            sort_column: 排序欄位
            sort_order: 排序方式 (asc/desc)
        
        Returns:
            分頁結果字典
        """
        # 計算總數（優化：使用 count 查詢而非 len(query.all())）
        total = query.count()
        
        # 計算分頁資訊
        pages = math.ceil(total / limit) if total > 0 else 0
        has_next = page < pages
        has_prev = page > 1
        
        # 應用排序
        if sort_column:
            if sort_order.lower() == "asc":
                query = query.order_by(asc(sort_column))
            else:
                query = query.order_by(desc(sort_column))
        
        # 應用分頁
        offset = (page - 1) * limit
        items = query.offset(offset).limit(limit).all()
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
            "has_next": has_next,
            "has_prev": has_prev,
            "next_page": page + 1 if has_next else None,
            "prev_page": page - 1 if has_prev else None
        }
    
    @staticmethod
    def paginate_bot_users(
        db: Session,
        bot_id: str,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        active_only: bool = False
    ) -> Dict[str, Any]:
        """
        分頁獲取 Bot 用戶列表
        
        Args:
            db: 資料庫會話
            bot_id: Bot ID
            page: 頁碼
            limit: 每頁項目數
            search: 搜尋關鍵字
            active_only: 只顯示活躍用戶
        """
        from app.models.line_user import LineBotUser
        
        query = db.query(LineBotUser).filter(LineBotUser.bot_id == bot_id)
        
        # 應用搜尋條件
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                LineBotUser.display_name.ilike(search_pattern) |
                LineBotUser.line_user_id.ilike(search_pattern)
            )
        
        # 只顯示活躍用戶
        if active_only:
            query = query.filter(LineBotUser.is_followed == True)
        
        return LazyLoader.paginate_query(
            db=db,
            query=query,
            page=page,
            limit=limit,
            sort_column=LineBotUser.last_interaction,
            sort_order="desc"
        )
    
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
    
    @staticmethod
    def paginate_logic_templates(
        db: Session,
        bot_id: str,
        page: int = 1,
        limit: int = 10,
        active_only: bool = False
    ) -> Dict[str, Any]:
        """
        分頁獲取邏輯模板
        
        Args:
            db: 資料庫會話
            bot_id: Bot ID  
            page: 頁碼
            limit: 每頁項目數
            active_only: 只顯示啟用的模板
        """
        from app.models.bot import LogicTemplate
        
        query = db.query(LogicTemplate).filter(LogicTemplate.bot_id == bot_id)
        
        if active_only:
            query = query.filter(LogicTemplate.is_active == "true")
        
        return LazyLoader.paginate_query(
            db=db,
            query=query,
            page=page,
            limit=limit,
            sort_column=LogicTemplate.updated_at,
            sort_order="desc"
        )
    
    @staticmethod
    def get_summary_stats(db: Session, bot_id: str) -> Dict[str, Any]:
        """
        獲取概要統計資料（不分頁）
        快速載入關鍵指標
        """
        from app.models.line_user import LineBotUser
        # TODO: LineBotUserInteraction 已遷移到 MongoDB
        from app.models.bot import LogicTemplate
        from datetime import datetime, timedelta
        
        # 今日開始時間
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        try:
            # 使用單一查詢獲取多項統計
            from sqlalchemy import text
            
            stats_query = text("""
                SELECT 
                    -- 用戶統計
                    COUNT(DISTINCT lbu.id) as total_users,
                    COUNT(DISTINCT CASE WHEN lbu.is_followed = true THEN lbu.id END) as active_users,
                    
                    -- 今日統計
                    COUNT(DISTINCT CASE WHEN lbui.timestamp >= :today_start THEN lbui.id END) as today_interactions,
                    COUNT(DISTINCT CASE WHEN lbui.timestamp >= :today_start THEN lbu.id END) as today_active_users,
                    
                    -- 邏輯模板統計
                    COUNT(DISTINCT lt.id) as total_templates,
                    COUNT(DISTINCT CASE WHEN lt.is_active = 'true' THEN lt.id END) as active_templates
                    
                FROM line_bot_users lbu
                LEFT JOIN line_bot_user_interactions lbui ON lbu.id = lbui.line_user_id
                LEFT JOIN logic_templates lt ON lt.bot_id = lbu.bot_id
                WHERE lbu.bot_id = :bot_id
            """)
            
            result = db.execute(stats_query, {
                "bot_id": bot_id,
                "today_start": today_start
            }).fetchone()
            
            return {
                "total_users": result.total_users or 0,
                "active_users": result.active_users or 0,
                "today_interactions": result.today_interactions or 0,
                "today_active_users": result.today_active_users or 0,
                "total_templates": result.total_templates or 0,
                "active_templates": result.active_templates or 0,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            # 如果原生查詢失敗，回退到個別查詢
            total_users = db.query(LineBotUser).filter(LineBotUser.bot_id == bot_id).count()
            return {
                "total_users": total_users,
                "active_users": 0,
                "today_interactions": 0,
                "today_active_users": 0,
                "total_templates": 0,
                "active_templates": 0,
                "generated_at": datetime.now().isoformat(),
                "fallback": True
            }