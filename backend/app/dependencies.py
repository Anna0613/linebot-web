"""
FastAPI 依賴注入模組
包含認證、資料庫會話等依賴項
"""
from typing import Optional, Callable
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import joinedload
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database_async import get_async_db
from app.models.user import User
from app.core.security import verify_token
from .config import settings

# 已移除 OAuth2 Bearer 方案，統一採用 HttpOnly Cookie


# 資料庫 session 依賴工廠
def get_db_session(use_replica: bool = False) -> Callable:
    """
    建立資料庫 session 依賴

    Args:
        use_replica: 是否使用從庫（僅用於讀取操作）
    """
    async def _get_db() -> AsyncSession:
        async for session in get_async_db(use_replica=use_replica):
            yield session
    return _get_db


# 預設使用主庫的 session（向後相容）
get_db_primary = get_db_session(use_replica=False)

# 讀取專用的 session（優先使用從庫）
get_db_read = get_db_session(use_replica=True)


async def get_current_user_async(
    request: Request,
    db: AsyncSession = Depends(get_db_primary)
) -> User:
    """Async version of current user dependency"""
    import logging
    logger = logging.getLogger(__name__)

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = request.cookies.get('token')
    logger.debug(f"Token from cookie: {token[:20]}..." if token else "None")

    if not token:
        logger.warning("No token found in request")
        raise credentials_exception

    try:
        payload = verify_token(token)
        username: str = payload.get("sub")
        logger.debug(f"Token verified, username: {username}")
        if username is None:
            logger.warning("No username in token payload")
            raise credentials_exception
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise credentials_exception

    stmt = select(User).options(joinedload(User.line_account)).where(User.username == username)
    result = await db.execute(stmt)
    user = result.scalars().first()
    if user is None:
        logger.warning(f"User not found: {username}")
        raise credentials_exception

    logger.info(f"Current user authenticated (async): {user.username} (ID: {user.id})")
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user_async)) -> User:
    """取得當前活躍用戶"""
    # 這裡可以添加額外的用戶狀態檢查
    # 例如檢查用戶是否被禁用、是否需要郵件驗證等
    return current_user
