"""
資料庫 Session 上下文管理
提供智能的讀寫分離和事務一致性管理
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession

from .database_async import get_async_db
from .db_context import SessionContext, reset_session_context

logger = logging.getLogger(__name__)


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

