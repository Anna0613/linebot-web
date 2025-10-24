"""
Token 自動刷新 Middleware
實現滑動過期機制（Sliding Window Expiration）
"""
import logging
from datetime import datetime, timedelta
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.security import verify_token, create_access_token, get_cookie_settings
from app.config import settings

logger = logging.getLogger(__name__)


class TokenRefreshMiddleware(BaseHTTPMiddleware):
    """
    Token 自動刷新中間件
    
    功能：
    1. 檢查每個請求的 token 剩餘有效時間
    2. 如果剩餘時間少於閾值（預設 50%），自動發放新 token
    3. 實現滑動過期機制，只要用戶持續活動就不會登出
    4. 只有閒置超過設定時間（預設 3 小時）才會過期
    """
    
    # 不需要刷新 token 的路徑
    EXCLUDED_PATHS = {
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/line/login",
        "/api/v1/auth/line/callback",
        "/api/v1/auth/refresh",
        "/api/v1/auth/logout",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/health",
    }
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """處理請求並自動刷新 token"""
        
        # 檢查是否為排除路徑
        if self._should_skip_refresh(request.url.path):
            return await call_next(request)
        
        # 嘗試從 cookie 獲取 token
        token = request.cookies.get("token")
        
        if not token:
            # 沒有 token，直接處理請求
            return await call_next(request)
        
        try:
            # 驗證並解析 token
            payload = verify_token(token)
            
            # 檢查是否需要刷新
            should_refresh, new_token = self._check_and_refresh_token(payload)
            
            # 處理請求
            response = await call_next(request)
            
            # 如果需要刷新，更新 cookie
            if should_refresh and new_token:
                self._update_token_cookie(response, new_token, payload)
                logger.info(f"Token 已自動刷新，用戶: {payload.get('sub')}")
            
            return response
            
        except Exception as e:
            # Token 驗證失敗或其他錯誤，不影響請求處理
            logger.debug(f"Token 刷新檢查失敗: {str(e)}")
            return await call_next(request)
    
    def _should_skip_refresh(self, path: str) -> bool:
        """檢查是否應該跳過 token 刷新"""
        # 完全匹配
        if path in self.EXCLUDED_PATHS:
            return True
        
        # 前綴匹配（例如靜態文件）
        if path.startswith("/static/") or path.startswith("/assets/"):
            return True
        
        return False
    
    def _check_and_refresh_token(self, payload: dict) -> tuple[bool, str | None]:
        """
        檢查 token 是否需要刷新
        
        Returns:
            (should_refresh, new_token): 是否需要刷新和新的 token
        """
        try:
            # 獲取過期時間
            exp_timestamp = payload.get("exp")
            if not exp_timestamp:
                return False, None
            
            # 計算剩餘時間
            exp_time = datetime.utcfromtimestamp(exp_timestamp)
            now = datetime.utcnow()
            remaining_time = (exp_time - now).total_seconds()
            
            # 如果已經過期，不刷新（讓正常的認證流程處理）
            if remaining_time <= 0:
                return False, None
            
            # 獲取 token 的總有效期
            remember_me = payload.get("remember_me", False)
            if remember_me:
                total_lifetime = settings.JWT_REMEMBER_EXPIRE_MINUTES * 60
            else:
                total_lifetime = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            
            # 計算剩餘時間百分比
            remaining_percentage = remaining_time / total_lifetime
            
            # 如果剩餘時間少於閾值，刷新 token
            if remaining_percentage < settings.TOKEN_REFRESH_THRESHOLD:
                # 創建新 token（保留原有的用戶資訊）
                token_data = {
                    "sub": payload.get("sub"),
                    "login_type": payload.get("login_type", "general"),
                }
                
                # 如果有其他自定義欄位，也保留
                for key in ["token_use"]:
                    if key in payload:
                        token_data[key] = payload[key]
                
                new_token = create_access_token(
                    data=token_data,
                    remember_me=remember_me
                )
                
                logger.debug(
                    f"Token 需要刷新 - 用戶: {payload.get('sub')}, "
                    f"剩餘: {remaining_percentage:.1%}, "
                    f"閾值: {settings.TOKEN_REFRESH_THRESHOLD:.1%}"
                )
                
                return True, new_token
            
            return False, None
            
        except Exception as e:
            logger.error(f"檢查 token 刷新時發生錯誤: {str(e)}")
            return False, None
    
    def _update_token_cookie(self, response: Response, new_token: str, payload: dict):
        """更新 response 中的 token cookie"""
        try:
            remember_me = payload.get("remember_me", False)
            cookie_settings = get_cookie_settings(remember_me)
            
            response.set_cookie(
                key="token",
                value=new_token,
                **cookie_settings
            )
        except Exception as e:
            logger.error(f"更新 token cookie 時發生錯誤: {str(e)}")

