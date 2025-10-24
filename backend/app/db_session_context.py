"""
資料庫 Session 上下文管理
提供智能的讀寫分離和事務一致性管理
"""
from __future__ import annotations

import logging
from typing import Optional, Any
from contextvars import ContextVar
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession

from .database_async import get_async_db

logger = logging.getLogger(__name__)

# 使用 ContextVar 追蹤當前請求是否有寫入操作
_has_write_operation: ContextVar[bool] = ContextVar('has_write_operation', default=False)
# 偏好使用從庫的請求級旗標（由中間件依 HTTP 方法設定）
_prefer_replica: ContextVar[bool] = ContextVar('prefer_replica', default=False)

# 追蹤當前請求的主 session（用於事務一致性）
_primary_session: ContextVar[Optional[AsyncSession]] = ContextVar('primary_session', default=None)


class SessionContext:
    """Session 上下文管理器 - 提供智能的讀寫分離"""
    
    @staticmethod
    def mark_write_operation():
        """標記當前請求有寫入操作"""
        _has_write_operation.set(True)
        logger.debug("已標記寫入操作，後續讀取將使用主庫")
    
    @staticmethod
    def has_write_operation() -> bool:
        """檢查當前請求是否有寫入操作"""
        return _has_write_operation.get(False)
    
    @staticmethod
    def reset():
        """重置上下文（通常在請求結束時調用）"""
        _has_write_operation.set(False)
        _primary_session.set(None)
        _prefer_replica.set(False)
    
    @staticmethod
    def set_primary_session(session: AsyncSession):
        """設定主 session"""
        _primary_session.set(session)
    
    @staticmethod
    def get_primary_session() -> Optional[AsyncSession]:
        """取得主 session"""
        return _primary_session.get(None)

    @staticmethod
    def set_prefer_replica(flag: bool):
        """設定此請求是否偏好使用從庫（僅讀場景）"""
        _prefer_replica.set(bool(flag))

    @staticmethod
    def prefer_replica() -> bool:
        """此請求是否偏好使用從庫"""
        return _prefer_replica.get(False)


@asynccontextmanager
async def get_smart_db_session(force_primary: bool = False):
    """
    智能資料庫 session 管理
    
    特性：
    1. 自動選擇主庫或從庫
    2. 寫入操作後的讀取自動使用主庫（事務一致性）
    3. 支援強制使用主庫
    
    Args:
        force_primary: 強制使用主庫
    
    Usage:
        # 讀取操作（可能使用從庫）
        async with get_smart_db_session() as db:
            result = await db.execute(select(User))
        
        # 寫入操作（必定使用主庫）
        async with get_smart_db_session(force_primary=True) as db:
            db.add(new_user)
            await db.commit()
    """
    # 決定是否使用從庫
    use_replica = False
    
    if not force_primary:
        # 如果當前請求已有寫入操作，則使用主庫確保一致性
        if SessionContext.has_write_operation():
            logger.debug("檢測到寫入操作，使用主庫確保一致性")
            use_replica = False
        else:
            # 嘗試使用從庫進行讀取
            use_replica = True
    
    # 如果是寫入操作，標記上下文
    if force_primary:
        SessionContext.mark_write_operation()
    
    # 取得 session
    async for session in get_async_db(use_replica=use_replica):
        # 如果是主庫 session，保存到上下文
        if not use_replica:
            SessionContext.set_primary_session(session)
        
        try:
            yield session
        finally:
            pass


class ReadWriteSession:
    """
    讀寫分離 Session 包裝器
    提供明確的讀寫操作介面
    """
    
    @staticmethod
    @asynccontextmanager
    async def read():
        """
        取得讀取專用 session
        
        注意：如果當前請求已有寫入操作，會自動使用主庫確保一致性
        
        Usage:
            async with ReadWriteSession.read() as db:
                users = await db.execute(select(User))
        """
        async with get_smart_db_session(force_primary=False) as session:
            yield session
    
    @staticmethod
    @asynccontextmanager
    async def write():
        """
        取得寫入專用 session
        
        自動標記寫入操作，後續讀取將使用主庫
        
        Usage:
            async with ReadWriteSession.write() as db:
                db.add(new_user)
                await db.commit()
        """
        async with get_smart_db_session(force_primary=True) as session:
            yield session


# FastAPI 依賴注入輔助函數
async def get_read_db_session():
    """
    FastAPI 依賴注入 - 讀取專用 session
    
    Usage:
        @router.get("/users")
        async def get_users(db: AsyncSession = Depends(get_read_db_session)):
            result = await db.execute(select(User))
            return result.scalars().all()
    """
    async with get_smart_db_session(force_primary=False) as session:
        yield session


async def get_write_db_session():
    """
    FastAPI 依賴注入 - 寫入專用 session
    
    Usage:
        @router.post("/users")
        async def create_user(
            user_data: UserCreate,
            db: AsyncSession = Depends(get_write_db_session)
        ):
            new_user = User(**user_data.dict())
            db.add(new_user)
            await db.commit()
            return new_user
    """
    async with get_smart_db_session(force_primary=True) as session:
        yield session


# 中間件輔助函數
async def reset_session_context():
    """
    重置 session 上下文
    
    應在每個請求結束時調用（通常在中間件中）
    """
    SessionContext.reset()
