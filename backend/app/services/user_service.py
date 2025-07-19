"""
用戶管理服務模組
處理用戶資料管理、頭像上傳、密碼變更等功能
"""
from datetime import datetime
from typing import Dict, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import re
import base64

from app.models.user import User
from app.schemas.user import UserProfile, UserUpdate, AvatarUpload
from app.schemas.auth import PasswordChange
from app.core.security import verify_password, get_password_hash

class UserService:
    """用戶管理服務類別"""
    
    @staticmethod
    def get_user_profile(db: Session, user_id: UUID) -> UserProfile:
        """取得用戶個人檔案"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )
        
        return UserProfile(
            id=str(user.id),
            username=user.username,
            email=user.email,
            email_verified=user.email_verified,
            avatar_updated_at=user.avatar_updated_at,
            created_at=user.created_at
        )
    
    @staticmethod
    def update_user_profile(db: Session, user_id: UUID, user_data: UserUpdate) -> UserProfile:
        """更新用戶個人檔案"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )
        
        # 檢查用戶名稱重複
        if user_data.username and user_data.username != user.username:
            existing_user = db.query(User).filter(
                User.username == user_data.username,
                User.id != user_id
            ).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="用戶名稱已被使用"
                )
        
        # 檢查郵箱重複
        if user_data.email and user_data.email != user.email:
            existing_user = db.query(User).filter(
                User.email == user_data.email,
                User.id != user_id
            ).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="郵箱地址已被使用"
                )
            # 如果更新郵箱，需要重新驗證
            user.email_verified = False
        
        # 更新用戶資料
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        db.commit()
        db.refresh(user)
        
        return UserProfile(
            id=str(user.id),
            username=user.username,
            email=user.email,
            email_verified=user.email_verified,
            avatar_updated_at=user.avatar_updated_at,
            created_at=user.created_at
        )
    
    @staticmethod
    def get_user_avatar(db: Session, user_id: UUID) -> Dict[str, any]:
        """取得用戶頭像"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )
        
        if not user.avatar_base64:
            return {
                "avatar": None,
                "updated_at": None,
                "message": "尚未設定頭像"
            }
        
        return {
            "avatar": user.avatar_base64,
            "updated_at": user.avatar_updated_at
        }
    
    @staticmethod
    def update_user_avatar(db: Session, user_id: UUID, avatar_data: AvatarUpload) -> Dict[str, str]:
        """更新用戶頭像"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )
        
        # 驗證頭像資料（已在 AvatarUpload schema 中進行）
        user.avatar_base64 = avatar_data.avatar_base64
        user.avatar_updated_at = datetime.utcnow()
        
        db.commit()
        
        return {"message": "頭像更新成功"}
    
    @staticmethod
    def delete_user_avatar(db: Session, user_id: UUID) -> Dict[str, str]:
        """刪除用戶頭像"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )
        
        if not user.avatar_base64:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶尚未設定頭像"
            )
        
        user.avatar_base64 = None
        user.avatar_updated_at = None
        
        db.commit()
        
        return {"message": "頭像已成功刪除"}
    
    @staticmethod
    def change_password(db: Session, user_id: UUID, password_data: PasswordChange) -> Dict[str, str]:
        """變更用戶密碼"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用戶不存在"
            )
        
        # 驗證當前密碼
        if not verify_password(password_data.current_password, user.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="當前密碼錯誤"
            )
        
        # 檢查新密碼是否與當前密碼相同
        if verify_password(password_data.new_password, user.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="新密碼不能與當前密碼相同"
            )
        
        # 更新密碼
        user.password = get_password_hash(password_data.new_password)
        db.commit()
        
        return {"message": "密碼變更成功"}
    
    @staticmethod
    def validate_avatar_base64(avatar_data: str) -> tuple[bool, str]:
        """驗證頭像 Base64 資料"""
        if not avatar_data:
            return False, "頭像資料不能為空"
        
        # 檢查是否是有效的 data URL 格式
        data_url_pattern = r'^data:image/(jpeg|jpg|png|gif);base64,([A-Za-z0-9+/=]+)$'
        match = re.match(data_url_pattern, avatar_data)
        
        if not match:
            return False, "無效的圖片格式，只允許 JPEG、PNG 和 GIF"
        
        # 獲取 base64 部分
        base64_data = match.group(2)
        
        # 檢查大小（限制 500KB 的原始圖片，Base64 編碼後約 667KB）
        if len(base64_data) > 700000:  # 約 500KB 圖片的 Base64 編碼
            return False, "圖片大小過大，最大允許 500KB"
        
        try:
            # 嘗試解碼 base64 以驗證有效性
            decoded = base64.b64decode(base64_data)
            if len(decoded) < 100:  # 太小可能不是有效圖片
                return False, "無效的圖片資料"
            return True, "有效"
        except Exception:
            return False, "無效的 base64 編碼" 