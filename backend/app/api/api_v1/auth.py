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
from app.schemas.auth import UserRegister, UserLogin, Token, EmailVerification, ForgotPassword, RefreshToken
from app.core.security import get_cookie_settings, get_refresh_cookie_settings
from app.models.user import User

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
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """用戶登入"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"用戶登入請求: username={login_data.username}, remember_me={login_data.remember_me}")
        
        token = AuthService.authenticate_user(
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
        
        # 確保資料庫事務提交
        try:
            db.commit()
            logger.info("資料庫事務提交成功")
        except Exception as commit_error:
            logger.error(f"資料庫提交失敗: {str(commit_error)}", exc_info=True)
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="登入處理失敗，請稍後再試"
            )
        
        return token
        
    except Exception as e:
        logger.error(f"登入失敗: {str(e)}", exc_info=True)
        db.rollback()  # 確保資料庫事務回滾
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"登入失敗: {str(e)}"
        )

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
        
        # 重導向到前端，並透過 URL 參數傳遞 token
        from app.config import settings
        import urllib.parse
        
        token = result["access_token"]
        user_data = result["user"]
        
        # 將用戶資料編碼為 URL 參數
        params = {
            "token": token,
            "username": user_data["username"],
            "email": user_data.get("email", ""),
            "login_type": "line"
        }
        
        query_string = urllib.parse.urlencode(params)
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login-success?{query_string}")
        
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

@router.post("/forgot_password", response_model=Dict[str, str])
async def forgot_password(
    email_data: ForgotPassword,
    db: Session = Depends(get_db)
):
    """忘記密碼 - 發送重設連結"""
    return AuthService.send_password_reset_email(db, email_data.email)

@router.post("/reset_password/{token}", response_model=Dict[str, str])
async def reset_password(
    token: str,
    password_data: dict,
    db: Session = Depends(get_db)
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
    
    return AuthService.reset_password(db, token, new_password)

@router.post("/refresh", response_model=Token)
async def refresh_token(
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
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
    new_token = AuthService.refresh_access_token(db, refresh_token)
    
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
async def logout(response: Response):
    """用戶登出"""
    response.delete_cookie(key="token")
    response.delete_cookie(key="refresh_token")
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

@router.post("/test-cookie")
async def test_cookie(response: Response):
    """測試 cookie 設定"""
    from app.core.security import get_cookie_settings
    cookie_settings = get_cookie_settings()
    
    # 設定一個測試 cookie
    response.set_cookie(
        key="test_token",
        value="test_value_123456",
        **cookie_settings
    )
    
    return {
        "message": "測試 cookie 已設定",
        "cookie_settings": cookie_settings
    }

# 為了相容性保留的路由
@router.post("/verify-token")
async def verify_token_compatibility(
    request: Request, 
    db: Session = Depends(get_db)
):
    """驗證 token（相容舊版）"""
    try:
        # 從請求體取得 token
        body = await request.json()
        token = body.get('token')
        
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token is missing"
            )
        
        # 驗證 token
        from app.core.security import verify_token
        try:
            payload = verify_token(token)
            username = payload.get("sub")
            login_type = payload.get("login_type")
            
            if not username:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token data"
                )
            
            # 查找用戶
            user = db.query(User).filter(User.username == username).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # 如果是 LINE 登入，返回 LINE 特定資料
            if login_type == "line" and user.line_account:
                return {
                    "line_id": user.line_account.line_id,
                    "display_name": user.line_account.display_name,
                    "picture_url": user.line_account.picture_url,
                    "username": user.username,
                    "email": user.email,
                    "login_type": "line"
                }
            else:
                # 一般登入用戶
                return {
                    "username": user.username,
                    "email": user.email,
                    "login_type": login_type or "general"
                }
                
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token validation failed: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        ) 