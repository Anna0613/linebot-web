"""
API 依賴項 - WebSocket 專用驗證函數
只保留 WebSocket 無法使用標準 HTTP 驗證的特殊情況
其他情況請使用 app.dependencies
"""
from fastapi import Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
import logging

from app.database import get_db
from app.models.user import User
from app.core.security import verify_token

logger = logging.getLogger(__name__)

def get_current_user_websocket(
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
        payload = verify_token(token)
        username = payload.get("sub")
        
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        # 獲取用戶
        user = db.query(User).filter(User.username == username).first()
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

# WebSocket 專用驗證（無法使用標準 HTTP 認證頭）
