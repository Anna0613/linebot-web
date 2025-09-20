"""
FastAPI 依賴注入模組
包含認證、資料庫會話等依賴項
"""
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.user import User
from app.core.security import verify_token, extract_token_from_header
from .config import settings

# OAuth2 方案
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")

def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """取得當前用戶"""
    import logging
    logger = logging.getLogger(__name__)
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = None
    
    # 首先嘗試從 Authorization header 獲取 token
    auth_header = request.headers.get('Authorization')
    logger.debug(f"Authorization header: {auth_header}")
    
    if auth_header:
        try:
            token = extract_token_from_header(auth_header)
            logger.debug(f"Token extracted from header: {token[:20]}..." if token else "None")
        except HTTPException as e:
            logger.warning(f"Invalid Authorization header: {e}")
            # Authorization header 無效，嘗試從 cookie 獲取
            token = request.cookies.get('token')
            logger.debug(f"Token from cookie: {token[:20]}..." if token else "None")
    else:
        # 如果沒有 Authorization header，嘗試從 cookie 獲取
        token = request.cookies.get('token')
        logger.debug(f"No Authorization header, token from cookie: {token[:20]}..." if token else "None")
    
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
    
    user = db.query(User).options(joinedload(User.line_account)).filter(User.username == username).first()
    if user is None:
        logger.warning(f"User not found: {username}")
        raise credentials_exception
    
    logger.info(f"Current user authenticated: {user.username} (ID: {user.id})")
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """取得當前活躍用戶"""
    # 這裡可以添加額外的用戶狀態檢查
    # 例如檢查用戶是否被禁用、是否需要郵件驗證等
    return current_user

def get_db_session() -> Generator[Session, None, None]:
    """取得資料庫會話（別名）"""
    return get_db() 
