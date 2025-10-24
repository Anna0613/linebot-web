"""
Async SQLAlchemy engine and session management
"""
from __future__ import annotations

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .config import settings

logger = logging.getLogger(__name__)


def _build_async_url(url: str) -> str:
    # Convert sync URL to asyncpg URL if needed
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


ASYNC_DATABASE_URL = _build_async_url(settings.DATABASE_URL)

engine = create_async_engine(
    ASYNC_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=25,
    max_overflow=50,
    pool_recycle=1800,
    # 僅在明確開啟 SQL_ECHO 時才輸出 SQL（避免噪音）
    echo=settings.SQL_ECHO,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an AsyncSession for request scope."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            # Connection cleanup is handled by context manager
            pass

