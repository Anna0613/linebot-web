"""
API 依賴項
提供通用的依賴注入功能
"""
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
import logging

from app.database import get_db
from app.models.user import User
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)

# HTTP Bearer 認證方案
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    獲取當前認證用戶
    用於需要認證的 HTTP API 端點
    """
    try:
        # 驗證 token
        payload = AuthService.verify_token(credentials.credentials)
        user_id = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # 獲取用戶
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
        
    except Exception as e:
        logger.error(f"認證失敗: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user_websocket(
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> User:
    """
    獲取當前認證用戶 (WebSocket 專用)
    WebSocket 無法使用 HTTP Bearer，改用查詢參數
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token"
        )
    
    try:
        # 驗證 token
        payload = AuthService.verify_token(token)
        user_id = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        # 獲取用戶
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return user
        
    except Exception as e:
        logger.error(f"WebSocket 認證失敗: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    獲取當前活躍用戶
    確保用戶帳號未被停用
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    獲取可選的當前用戶
    用於可選認證的端點
    """
    if not credentials:
        return None
    
    try:
        payload = AuthService.verify_token(credentials.credentials)
        user_id = payload.get("sub")
        
        if user_id is None:
            return None
        
        user = db.query(User).filter(User.id == user_id).first()
        return user
        
    except Exception:
        return None

def require_permissions(*permissions: str):
    """
    權限檢查裝飾器工廠
    用於需要特定權限的端點
    """
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        # 檢查用戶是否有所需權限
        user_permissions = getattr(current_user, 'permissions', [])
        
        for permission in permissions:
            if permission not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {permission} required"
                )
        
        return current_user
    
    return permission_checker

def require_admin():
    """
    管理員權限檢查
    """
    def admin_checker(current_user: User = Depends(get_current_user)) -> User:
        if not getattr(current_user, 'is_admin', False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        return current_user
    
    return admin_checker

# 常用的依賴項別名
CurrentUser = Depends(get_current_user)
CurrentActiveUser = Depends(get_current_active_user)
OptionalCurrentUser = Depends(get_optional_current_user)
AdminUser = Depends(require_admin())
