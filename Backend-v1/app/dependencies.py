"""
FastAPI 依賴注入模組
包含認證、資料庫會話等依賴項
"""
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.security import verify_token, extract_token_from_header
from app.config import settings

# OAuth2 方案
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """取得當前用戶"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = None
    
    # 首先嘗試從 Authorization header 獲取 token
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = extract_token_from_header(auth_header)
        except HTTPException:
            # Authorization header 無效，嘗試從 cookie 獲取
            token = request.cookies.get('token')
    else:
        # 如果沒有 Authorization header，嘗試從 cookie 獲取
        token = request.cookies.get('token')
    
    if not token:
        raise credentials_exception
    
    try:
        payload = verify_token(token)
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """取得當前活躍用戶"""
    # 這裡可以添加額外的用戶狀態檢查
    # 例如檢查用戶是否被禁用、是否需要郵件驗證等
    return current_user

def get_db_session() -> Generator[Session, None, None]:
    """取得資料庫會話（別名）"""
    return get_db() 