"""
FastAPI 依賴注入模組
包含認證、資料庫會話等依賴項
"""
from typing import Optional, Callable, Dict, Any, AsyncGenerator
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import joinedload
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database_async import get_async_db
from app.models.user import User
from app.core.security import verify_token
from .config import settings
from app.db_session_context import get_read_db_session, get_write_db_session
from app.db_context import SessionContext
from app.config.redis_config import CacheService, CacheKeys, USER_SESSION_TTL
import json


# 已移除 OAuth2 Bearer 方案，統一採用 HttpOnly Cookie


# 資料庫 session 依賴工廠
def get_db_session(use_replica: bool = False) -> Callable[[], AsyncGenerator[AsyncSession, None]]:
    """
    建立資料庫 session 依賴

    Args:
        use_replica: 是否使用從庫（僅用於讀取操作）
    """
    async def _get_db() -> AsyncGenerator[AsyncSession, None]:
        async for session in get_async_db(use_replica=use_replica):
            yield session
    return _get_db


# 預設使用主庫的 session（統一使用智慧 Session）
get_db_primary = get_write_db_session

# 讀取專用的 session（統一使用智慧 Session）
get_db_read = get_read_db_session


async def get_current_user_async(
    request: Request,
    db: AsyncSession = Depends(get_db_primary)
) -> User:
    """
    Async version of current user dependency with Redis caching

    快取策略：
    1. 先從 Redis 快取中查找用戶資訊（基於 token hash）
    2. 如果快取命中，直接返回用戶物件（避免資料庫查詢）
    3. 如果快取未命中，從資料庫查詢並快取結果
    4. 快取時間：30 分鐘（與 USER_SESSION_TTL 一致）
    """
    import logging
    import hashlib
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

    # 驗證 token 並獲取 payload
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

    # 生成快取鍵（使用 token 的 hash 值，避免快取鍵過長）
    token_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
    cache_key = f"auth:user:{username}:{token_hash}"

    # 嘗試從快取獲取用戶資訊
    try:
        cached_user_data = await CacheService.get(cache_key)
        if cached_user_data:
            logger.debug(f"User cache hit for {username}")
            # 從快取資料重建 User 物件
            user = User(
                id=cached_user_data['id'],
                username=cached_user_data['username'],
                email=cached_user_data.get('email'),
                email_verified=cached_user_data.get('email_verified', False)
            )
            # 如果有 line_account 資訊，也要設定
            if cached_user_data.get('line_account'):
                from app.models.user import LineUser
                line_data = cached_user_data['line_account']
                user.line_account = LineUser(
                    id=line_data['id'],
                    user_id=line_data['user_id'],
                    line_id=line_data['line_id'],
                    display_name=line_data.get('display_name'),
                    picture_url=line_data.get('picture_url')
                )
            return user
    except Exception as e:
        logger.warning(f"Cache retrieval failed for {username}: {e}")
        # 快取失敗不影響正常流程，繼續從資料庫查詢

    # 快取未命中，從資料庫查詢
    stmt = select(User).options(joinedload(User.line_account)).where(User.username == username)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if user is None:
        logger.warning(f"User not found: {username}")
        raise credentials_exception

    # 將用戶資訊快取到 Redis
    try:
        user_data = {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'email_verified': user.email_verified
        }
        # 如果有 LINE 帳號資訊，也一併快取
        if user.line_account:
            user_data['line_account'] = {
                'id': str(user.line_account.id),
                'user_id': str(user.line_account.user_id),
                'line_id': user.line_account.line_id,
                'display_name': user.line_account.display_name,
                'picture_url': user.line_account.picture_url
            }

        await CacheService.set(cache_key, user_data, ttl=USER_SESSION_TTL)
        logger.debug(f"User data cached for {username}")
    except Exception as e:
        logger.warning(f"Failed to cache user data for {username}: {e}")
        # 快取失敗不影響正常流程

    logger.info(f"Current user authenticated (async): {user.username} (ID: {user.id})")
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user_async)) -> User:
    """取得當前活躍用戶"""
    # 這裡可以添加額外的用戶狀態檢查
    # 例如檢查用戶是否被禁用、是否需要郵件驗證等
    return current_user
