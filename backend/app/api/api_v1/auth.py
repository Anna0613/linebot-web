"""
認證相關 API 路由
處理用戶註冊、登入、LINE 登入等功能
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict

from app.database_async import get_async_db
from app.dependencies import get_db_primary
from app.services.auth_service import AuthService
from app.schemas.auth import UserRegister, UserLogin, Token, EmailVerification, ForgotPassword, RefreshToken
from app.core.security import get_cookie_settings, get_refresh_cookie_settings
from app.models.user import User
from app.dependencies import get_current_user_async
from datetime import timedelta

router = APIRouter()

@router.post("/register", response_model=Dict[str, str])
async def register(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_async_db)
):
    """用戶註冊"""
    return await AuthService.register_user(db, user_data)

@router.post("/login", response_model=Token)
async def login(
    response: Response,
    login_data: UserLogin,
    db: AsyncSession = Depends(get_async_db)
):
    """用戶登入"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"用戶登入請求: username={login_data.username}, remember_me={login_data.remember_me}")
        
        token = await AuthService.authenticate_user(
            db, 
            login_data.username, 
            login_data.password, 
            login_data.remember_me
        )
        
        logger.info(f"認證成功，用戶: {login_data.username}")
        
        # 設定 Access Token Cookie
        try:
            logger.info("開始設定 cookies")
            cookie_settings = get_cookie_settings(login_data.remember_me)
            logger.info(f"Cookie 設定: {cookie_settings}")
            
            response.set_cookie(
                key="token",
                value=token.access_token,
                **cookie_settings
            )
            logger.info("Access token cookie 設定成功")
            
            # 如果有 refresh token，設定 refresh token cookie
            if token.refresh_token:
                refresh_cookie_settings = get_refresh_cookie_settings()
                logger.info(f"Refresh cookie 設定: {refresh_cookie_settings}")
                
                response.set_cookie(
                    key="refresh_token",
                    value=token.refresh_token,
                    **refresh_cookie_settings
                )
                logger.info("Refresh token cookie 設定成功")
            
            logger.info("所有 cookies 設定完成")
            
        except Exception as cookie_error:
            logger.error(f"Cookie 設定失敗: {str(cookie_error)}", exc_info=True)
            # 即使 cookie 設定失敗，也不應該讓登入失敗
            # 因為前端可以從回應中獲取 token
        
        return token
        
    except Exception as e:
        logger.error(f"登入失敗: {str(e)}", exc_info=True)
        await db.rollback()  # 確保資料庫事務回滾
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"登入失敗: {str(e)}"
        )

@router.post("/line-login", response_model=Dict[str, str])
async def line_login():
    """取得 LINE 登入 URL
    兼容 get_line_login_url 為同步或非同步定義的情況。
    """
    import inspect
    result = AuthService.get_line_login_url()
    if inspect.isawaitable(result):  # 若被定義為 async
        result = await result
    return result

@router.get("/line/callback")
async def line_callback(
    code: str,
    state: str,
    response: Response,
    db: AsyncSession = Depends(get_db_primary)
):
    """LINE 登入回調（Cookie-only，不再透過 URL 傳遞 token）"""
    try:
        result = await AuthService.handle_line_callback(db, code, state)

        # 只做重導向，不帶任何敏感資訊
        from app.config import settings
        redirect = RedirectResponse(url=f"{settings.FRONTEND_URL}/login-success")

        # 設定 Access Token Cookie（需設在實際回應物件上）
        access_token = result["access_token"]
        cookie_settings = get_cookie_settings(False)
        redirect.set_cookie(
            key="token",
            value=access_token,
            **cookie_settings
        )
        # 若未來需要，也可在此發 refresh_token（目前 LINE 登入預設不發）

        return redirect

    except HTTPException as e:
        # 重導向到錯誤頁面（不帶敏感資訊）
        from app.config import settings
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login-error?error={e.detail}")

@router.post("/verify-email", response_model=Dict[str, str])
async def verify_email(
    verification_data: EmailVerification,
    db: AsyncSession = Depends(get_async_db)
):
    """驗證郵箱"""
    return await AuthService.verify_email_token(db, verification_data.token)

# 已移除舊版 GET /verify_email/{token} 的相容路由，統一使用 POST /verify-email

@router.post("/resend-verification", response_model=Dict[str, str])
async def resend_verification(
    email_data: ForgotPassword,  # 重用 email 欄位
    db: AsyncSession = Depends(get_async_db)
):
    """重新發送驗證郵件"""
    return await AuthService.resend_verification_email(db, email_data.email)

@router.post("/forgot_password", response_model=Dict[str, str])
async def forgot_password(
    email_data: ForgotPassword,
    db: AsyncSession = Depends(get_async_db)
):
    """忘記密碼 - 發送重設連結"""
    return await AuthService.send_password_reset_email(db, email_data.email)

@router.post("/reset_password/{token}", response_model=Dict[str, str])
async def reset_password(
    token: str,
    password_data: dict,
    db: AsyncSession = Depends(get_async_db)
):
    """重設密碼"""
    new_password = password_data.get("new_password")
    if not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="新密碼不能為空"
        )
    
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="密碼必須至少 8 個字元"
        )
    
    return await AuthService.reset_password(db, token, new_password)

@router.post("/refresh", response_model=Token)
async def refresh_token(
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """刷新 access token"""
    # 從 cookie 中獲取 refresh token
    refresh_token = request.cookies.get("refresh_token")
    
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token 不存在"
        )
    
    # 刷新 token
    new_token = await AuthService.refresh_access_token(db, refresh_token)
    
    # 設定新的 access token cookie
    cookie_settings = get_cookie_settings(True)  # refresh 的都是記住我模式
    response.set_cookie(
        key="token",
        value=new_token.access_token,
        **cookie_settings
    )
    
    # 設定新的 refresh token cookie
    if new_token.refresh_token:
        refresh_cookie_settings = get_refresh_cookie_settings()
        response.set_cookie(
            key="refresh_token",
            value=new_token.refresh_token,
            **refresh_cookie_settings
        )
    
    return new_token

@router.post("/logout")
def logout(response: Response):
    """用戶登出"""
    response.delete_cookie(key="token")
    response.delete_cookie(key="refresh_token")
    return {"message": "登出成功"}

@router.get("/check-login")
async def check_login(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """檢查登入狀態"""
    try:
        user = await get_current_user_async(request, db)
        return {
            "authenticated": True,
            "user": {
                "id": str(user.id),
                "username": user.username,
                "email": user.email
            }
        }
    except HTTPException:
        return {"authenticated": False}

@router.get("/ws-ticket")
async def get_ws_ticket(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """取得 WebSocket 短效票證（需已登入）"""
    # 透過 Cookie 認證當前用戶
    user = await get_current_user_async(request, db)

    # 簽發短效（5 分鐘）票證，只用於 WS 握手
    from app.core.security import create_access_token
    ws_token = create_access_token(
        data={"sub": user.username, "login_type": "general", "token_use": "ws"},
        expires_delta=timedelta(minutes=5)
    )
    return {"ws_token": ws_token}

# 移除 /test-cookie 測試端點

# 已移除 /verify-token 相容端點
