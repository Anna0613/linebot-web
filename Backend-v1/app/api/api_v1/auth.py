"""
認證相關 API 路由
處理用戶註冊、登入、LINE 登入等功能
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Dict

from app.database import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import UserRegister, Token, EmailVerification, ForgotPassword
from app.core.security import get_cookie_settings

router = APIRouter()

@router.post("/register", response_model=Dict[str, str])
async def register(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    """用戶註冊"""
    return AuthService.register_user(db, user_data)

@router.post("/login", response_model=Token)
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """用戶登入"""
    token = AuthService.authenticate_user(db, form_data.username, form_data.password)
    
    # 設定 Cookie
    cookie_settings = get_cookie_settings()
    response.set_cookie(
        key="token",
        value=token.access_token,
        **cookie_settings
    )
    
    return token

@router.post("/line-login", response_model=Dict[str, str])
async def line_login():
    """取得 LINE 登入 URL"""
    return AuthService.get_line_login_url()

@router.get("/line/callback")
async def line_callback(
    code: str,
    state: str,
    response: Response,
    db: Session = Depends(get_db)
):
    """LINE 登入回調"""
    try:
        result = AuthService.handle_line_callback(db, code, state)
        
        # 設定 Cookie
        cookie_settings = get_cookie_settings()
        response.set_cookie(
            key="token",
            value=result["access_token"],
            **cookie_settings
        )
        
        # 重導向到前端頁面
        from app.config import settings
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login-success")
        
    except HTTPException as e:
        # 重導向到錯誤頁面
        from app.config import settings
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login-error?error={e.detail}")

@router.post("/verify-email", response_model=Dict[str, str])
async def verify_email(
    verification_data: EmailVerification,
    db: Session = Depends(get_db)
):
    """驗證郵箱"""
    return AuthService.verify_email_token(db, verification_data.token)

@router.get("/verify_email/{token}")
async def verify_email_redirect(token: str, db: Session = Depends(get_db)):
    """郵箱驗證重導向（相容舊版）"""
    try:
        result = AuthService.verify_email_token(db, token)
        from app.config import settings
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/email-verified")
    except HTTPException as e:
        from app.config import settings
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/email-verify-error?error={e.detail}")

@router.post("/resend-verification", response_model=Dict[str, str])
async def resend_verification(
    email_data: ForgotPassword,  # 重用 email 欄位
    db: Session = Depends(get_db)
):
    """重新發送驗證郵件"""
    return AuthService.resend_verification_email(db, email_data.email)

@router.post("/logout")
async def logout(response: Response):
    """用戶登出"""
    response.delete_cookie(key="token")
    return {"message": "登出成功"}

@router.get("/check-login")
async def check_login(
    request: Request,
    db: Session = Depends(get_db)
):
    """檢查登入狀態"""
    from app.dependencies import get_current_user
    try:
        user = await get_current_user(request, db)
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

# 為了相容性保留的路由
@router.post("/verify-token")
async def verify_token_compatibility(request: Request, db: Session = Depends(get_db)):
    """驗證 token（相容舊版）"""
    return await check_login(request, db) 