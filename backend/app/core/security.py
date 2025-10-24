"""
安全相關功能模組
包含密碼加密、JWT token 處理等功能
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from ..config import settings

# 密碼加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """驗證密碼"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """加密密碼"""
    return pwd_context.hash(password)

def create_access_token(data: Dict[Any, Any], expires_delta: Optional[timedelta] = None, remember_me: bool = False) -> str:
    """創建 JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # 根據記住我選項決定過期時間
        if remember_me:
            expire = datetime.utcnow() + timedelta(minutes=settings.JWT_REMEMBER_EXPIRE_MINUTES)
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "remember_me": remember_me})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Dict[str, Any]:
    """驗證 JWT token"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"無效的 token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

# 已移除 Authorization header 解析，統一改用 HttpOnly Cookie 認證

def create_refresh_token(data: Dict[Any, Any]) -> str:
    """創建 JWT refresh token (30天有效期)"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=30)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def get_cookie_settings(remember_me: bool = False) -> Dict[str, Any]:
    """
    取得 Cookie 設定

    Cookie domain 從環境變數 COOKIE_DOMAIN 讀取：
    - 本地開發：設定為 "localhost"（避免 localhost 和 127.0.0.1 的跨域問題）
    - 生產環境：設定為 None 或空字串（讓瀏覽器自動處理）
    """
    if remember_me:
        max_age = settings.JWT_REMEMBER_EXPIRE_MINUTES * 60
    else:
        max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    # 從環境變數讀取 cookie domain
    # 如果環境變數為空字串，轉換為 None
    cookie_domain = settings.COOKIE_DOMAIN if settings.COOKIE_DOMAIN else None

    return {
        "httponly": True,
        "secure": settings.ENVIRONMENT == "production",
        "samesite": "lax",
        "max_age": max_age,
        "domain": cookie_domain,
        "path": "/"
    }

def get_refresh_cookie_settings() -> Dict[str, Any]:
    """
    取得 Refresh Token Cookie 設定 (30天)

    Cookie domain 從環境變數 COOKIE_DOMAIN 讀取
    """
    # 從環境變數讀取 cookie domain
    cookie_domain = settings.COOKIE_DOMAIN if settings.COOKIE_DOMAIN else None

    return {
        "httponly": True,
        "secure": settings.ENVIRONMENT == "production",
        "samesite": "lax",
        "max_age": 30 * 24 * 60 * 60,  # 30天
        "domain": cookie_domain,
        "path": "/"
    }
