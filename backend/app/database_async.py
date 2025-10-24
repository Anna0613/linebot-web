"""
Async SQLAlchemy engine and session management
支援讀寫分離功能
"""
from __future__ import annotations

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db_read_write_split import db_manager, DatabaseRole

logger = logging.getLogger(__name__)

# 初始化連線管理器（如果尚未初始化）
if not db_manager._initialized:
    db_manager.initialize()

# 取得主庫 async 引擎（向後相容）
engine = db_manager.get_async_engine(DatabaseRole.PRIMARY)

# 取得主庫 async session factory（向後相容）
AsyncSessionLocal = db_manager.get_async_session_factory(DatabaseRole.PRIMARY)


async def get_async_db(use_replica: bool = False) -> AsyncGenerator[AsyncSession, None]:
    """
    Yield an AsyncSession for request scope.

    Args:
        use_replica: 是否使用從庫（僅用於讀取操作）
    """
    role = DatabaseRole.REPLICA if use_replica else DatabaseRole.PRIMARY
    session_factory = db_manager.get_async_session_factory(role)

    async with session_factory() as session:
        try:
            yield session
        finally:
            # Connection cleanup is handled by context manager
            pass

