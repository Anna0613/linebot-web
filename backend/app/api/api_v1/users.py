"""
用戶管理 API 路由
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserProfile, UserUpdate, AvatarUpload
from app.schemas.auth import PasswordChange
from app.services.user_service import UserService

router = APIRouter()

@router.get("/profile", response_model=UserProfile)
async def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得用戶個人檔案"""
    return UserService.get_user_profile(db, current_user.id)

@router.put("/profile", response_model=UserProfile)
async def update_profile(
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新用戶個人檔案"""
    return UserService.update_user_profile(db, current_user.id, user_data)

@router.get("/avatar")
async def get_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得用戶頭像"""
    return UserService.get_user_avatar(db, current_user.id)

@router.put("/avatar", response_model=Dict[str, str])
async def update_avatar(
    avatar_data: AvatarUpload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新用戶頭像"""
    return UserService.update_user_avatar(db, current_user.id, avatar_data)

@router.delete("/avatar", response_model=Dict[str, str])
async def delete_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """刪除用戶頭像"""
    return UserService.delete_user_avatar(db, current_user.id)

@router.post("/change-password", response_model=Dict[str, str])
async def change_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """變更用戶密碼"""
    return UserService.change_password(db, current_user.id, password_data) 