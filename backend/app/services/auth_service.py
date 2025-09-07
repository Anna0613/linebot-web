"""
認證服務模組
處理用戶註冊、登入、LINE 登入等認證相關業務邏輯
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import requests
import secrets
import string
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

from app.models.user import User, LineUser
from app.schemas.auth import UserRegister, UserLogin, Token
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, verify_token
from app.config import settings
from app.services.email_service import EmailService

class AuthService:
    """認證服務類別"""
    
    @staticmethod
    def register_user(db: Session, user_data: UserRegister) -> Dict[str, str]:
        """用戶註冊"""
        # 檢查用戶名稱是否已存在
        if db.query(User).filter(User.username == user_data.username).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="用戶名稱已被註冊"
            )
        
        # 檢查郵箱是否已存在
        if user_data.email and db.query(User).filter(User.email == user_data.email).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="郵箱地址已被註冊"
            )
        
        # 建立新用戶
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            username=user_data.username,
            email=user_data.email,
            password=hashed_password,
            email_verified=False if user_data.email else True  # 沒有郵箱的話直接設為已驗證
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # 發送驗證郵件（如果有提供郵箱）
        if user_data.email:
            try:
                EmailService.send_verification_email(user_data.email)
                print(f"驗證郵件已發送至: {user_data.email}")
            except Exception as e:
                # 郵件發送失敗不影響註冊流程，只記錄錯誤
                print(f"郵件發送失敗: {e}")
                # 不拋出異常，讓註冊流程繼續

        return {"message": "用戶註冊成功，請檢查您的郵箱以驗證帳戶"}
    
    @staticmethod
    def authenticate_user(db: Session, username: str, password: str, remember_me: bool = False) -> Token:
        """用戶認證登入"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"開始認證用戶: {username}, remember_me: {remember_me}")
        
        # 支援用戶名稱或郵箱登入
        user = db.query(User).filter(
            (User.username == username) | (User.email == username)
        ).first()
        
        if not user:
            logger.warning(f"用戶不存在: {username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用戶名稱或密碼錯誤"
            )
        
        logger.info(f"找到用戶: {user.username} (ID: {user.id})")
        
        # 驗證密碼
        try:
            if not verify_password(password, user.password):
                logger.warning(f"用戶密碼錯誤: {username}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="用戶名稱或密碼錯誤"
                )
            logger.info("密碼驗證成功")
        except Exception as e:
            logger.error(f"密碼驗證過程出錯: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用戶名稱或密碼錯誤"
            )
        
        # 檢查郵箱驗證狀態（如果有郵箱的話）
        if user.email and not user.email_verified:
            logger.warning(f"用戶 {username} 郵箱未驗證")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="郵箱尚未驗證，請檢查您的郵箱"
            )
        
        logger.info("開始生成 JWT token")
        
        try:
            # 生成 JWT token（根據記住我選項決定過期時間）
            access_token = create_access_token(
                data={"sub": user.username, "login_type": "general"},
                remember_me=remember_me
            )
            logger.info(f"Access token 生成成功，remember_me: {remember_me}")
            
            # 如果選擇記住我，則生成 refresh token
            refresh_token = None
            if remember_me:
                refresh_token = create_refresh_token(
                    data={"sub": user.username, "login_type": "general"}
                )
                logger.info("Refresh token 生成成功")
            
            logger.info("認證完成，返回 token")
            
            return Token(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                remember_me=remember_me,
                user={
                    "id": str(user.id),
                    "username": user.username,
                    "email": user.email,
                    "login_type": "general"
                }
            )
        except Exception as e:
            logger.error(f"Token 生成失敗: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"登入處理失敗: {str(e)}"
            )
    
    @staticmethod
    def get_line_login_url() -> Dict[str, str]:
        """取得 LINE 登入 URL"""
        if not settings.LINE_CHANNEL_ID:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="LINE 登入未配置"
            )
        
        # 生成隨機 state
        state = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
        
        line_login_url = (
            f"https://access.line.me/oauth2/v2.1/authorize?"
            f"response_type=code&"
            f"client_id={settings.LINE_CHANNEL_ID}&"
            f"redirect_uri={settings.LINE_REDIRECT_URI}&"
            f"state={state}&"
            f"scope=profile"
        )
        
        return {
            "url": line_login_url,
            "login_url": line_login_url,  # 向後相容
            "state": state
        }
    
    @staticmethod
    def handle_line_callback(db: Session, code: str, state: str) -> Dict[str, str]:
        """處理 LINE 登入回調"""
        try:
            # 取得 access token
            token_response = requests.post(
                "https://api.line.me/oauth2/v2.1/token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": settings.LINE_REDIRECT_URI,
                    "client_id": settings.LINE_CHANNEL_ID,
                    "client_secret": settings.LINE_CHANNEL_SECRET
                }
            )
            
            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="LINE 授權失敗"
                )
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            # 取得用戶資料
            profile_response = requests.get(
                "https://api.line.me/v2/profile",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if profile_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="無法取得 LINE 用戶資料"
                )
            
            profile_data = profile_response.json()
            line_id = profile_data.get("userId")
            display_name = profile_data.get("displayName")
            picture_url = profile_data.get("pictureUrl")
            
            # 檢查是否已存在 LINE 用戶
            line_user = db.query(LineUser).filter(LineUser.line_id == line_id).first()
            
            if line_user:
                # 已存在的 LINE 用戶，直接登入
                user = line_user.user
                # 更新用戶的顯示名稱和頭像（如果有變更）
                if line_user.display_name != display_name:
                    line_user.display_name = display_name
                if line_user.picture_url != picture_url:
                    line_user.picture_url = picture_url
                db.commit()  # 確保已存在用戶也要 commit
            else:
                # 新的 LINE 用戶，建立帳號
                # 生成唯一的用戶名稱
                base_username = display_name or f"line_user_{line_id[:8]}"
                username = base_username
                counter = 1
                while db.query(User).filter(User.username == username).first():
                    username = f"{base_username}_{counter}"
                    counter += 1
                
                # 建立新用戶
                user = User(
                    username=username,
                    password=get_password_hash(''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))),  # 隨機密碼
                    email_verified=True  # LINE 用戶預設為已驗證
                )
                db.add(user)
                db.flush()  # 取得用戶 ID
                
                # 建立 LINE 用戶記錄
                line_user = LineUser(
                    user_id=user.id,
                    line_id=line_id,
                    display_name=display_name,
                    picture_url=picture_url
                )
                db.add(line_user)
                db.commit()
            
            # 生成 JWT token
            jwt_token = create_access_token(
                data={"sub": user.username, "login_type": "line"},
                remember_me=False  # LINE 登入預設不記住我
            )
            
            return {
                "access_token": jwt_token,
                "token_type": "bearer",
                "user": {
                    "id": str(user.id),
                    "username": user.username,
                    "email": user.email,
                    "login_type": "line",
                    "line_display_name": display_name
                }
            }
            
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"LINE 登入處理失敗: {str(e)}"
            )
    
    @staticmethod
    def verify_email_token(db: Session, token: str) -> Dict[str, str]:
        """驗證郵箱 token"""
        try:
            serializer = URLSafeTimedSerializer(settings.FLASK_SECRET_KEY)
            email = serializer.loads(token, salt='email-verify', max_age=3600)  # 1小時過期
            
            user = db.query(User).filter(User.email == email).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="用戶不存在"
                )
            
            if user.email_verified:
                return {"message": "郵箱已經驗證過了"}
            
            user.email_verified = True
            db.commit()
            
            return {"message": "郵箱驗證成功"}
            
        except SignatureExpired:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="驗證連結已過期，請重新申請"
            )
        except BadSignature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的驗證連結"
            )
    
    @staticmethod
    def resend_verification_email(db: Session, email: str) -> Dict[str, str]:
        """重新發送驗證郵件"""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="郵箱地址不存在"
            )
        
        if user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="郵箱已經驗證過了"
            )
        
        # 檢查發送頻率限制
        if user.last_verification_sent:
            time_diff = datetime.now(timezone.utc) - user.last_verification_sent
            if time_diff < timedelta(minutes=1):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="請稍後再試，發送過於頻繁"
                )
        
        # 發送驗證郵件（現在不會拋出異常）
        EmailService.send_verification_email(email)
        user.last_verification_sent = datetime.now(timezone.utc)
        db.commit()
        return {"message": "驗證郵件已重新發送"}
    
    @staticmethod
    def send_password_reset_email(db: Session, email: str) -> Dict[str, str]:
        """發送密碼重設郵件"""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="郵箱地址不存在"
            )
        
        # 檢查發送頻率限制
        if user.last_verification_sent:
            time_diff = datetime.now(timezone.utc) - user.last_verification_sent
            if time_diff < timedelta(minutes=1):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="請稍後再試，發送過於頻繁"
                )
        
        try:
            EmailService.send_password_reset_email(email)
            user.last_verification_sent = datetime.now(timezone.utc)
            db.commit()
            return {"message": "密碼重設連結已發送至您的郵箱"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"郵件發送失敗: {str(e)}"
            )
    
    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> Dict[str, str]:
        """重設密碼"""
        try:
            serializer = URLSafeTimedSerializer(settings.FLASK_SECRET_KEY)
            email = serializer.loads(token, salt='password-reset', max_age=3600)  # 1小時過期
            
            user = db.query(User).filter(User.email == email).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="用戶不存在"
                )
            
            # 更新密碼
            user.password = get_password_hash(new_password)
            db.commit()
            
            return {"message": "密碼重設成功"}
            
        except SignatureExpired:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="重設連結已過期，請重新申請"
            )
        except BadSignature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="無效的重設連結"
            )
    
    @staticmethod
    def refresh_access_token(db: Session, refresh_token: str) -> Token:
        """使用 refresh token 刷新 access token"""
        try:
            # 驗證 refresh token
            payload = verify_token(refresh_token)
            username = payload.get("sub")
            login_type = payload.get("login_type", "general")
            token_type = payload.get("type")
            
            # 確認這是一個 refresh token
            if token_type != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="無效的 refresh token"
                )
            
            if not username:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="無效的 token 資料"
                )
            
            # 檢查用戶是否存在
            user = db.query(User).filter(User.username == username).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="用戶不存在"
                )
            
            # 生成新的 access token（記住我模式）
            new_access_token = create_access_token(
                data={"sub": user.username, "login_type": login_type},
                remember_me=True
            )
            
            # 生成新的 refresh token
            new_refresh_token = create_refresh_token(
                data={"sub": user.username, "login_type": login_type}
            )
            
            return Token(
                access_token=new_access_token,
                refresh_token=new_refresh_token,
                token_type="bearer",
                remember_me=True,
                user={
                    "id": str(user.id),
                    "username": user.username,
                    "email": user.email,
                    "login_type": login_type
                }
            )
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token 刷新失敗: {str(e)}"
            ) 