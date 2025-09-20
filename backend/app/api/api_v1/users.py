"""
用戶管理 API 路由
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict

from app.database_async import get_async_db
from app.dependencies import get_current_user_async
from app.models.user import User
from app.schemas.user import UserProfile, UserUpdate, AvatarUpload
from app.schemas.auth import PasswordChange
from app.services.user_service import UserService
from app.services.auth_service import AuthService

router = APIRouter()

@router.get("/profile", response_model=UserProfile)
async def get_profile(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """取得用戶個人檔案"""
    return await UserService.get_user_profile(db, current_user.id)

@router.put("/profile", response_model=UserProfile)
async def update_profile(
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """更新用戶個人檔案"""
    return await UserService.update_user_profile(db, current_user.id, user_data)

@router.get("/avatar")
async def get_avatar(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """取得用戶頭像"""
    return await UserService.get_user_avatar(db, current_user.id)

@router.put("/avatar", response_model=Dict[str, str])
async def update_avatar(
    avatar_data: AvatarUpload,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """更新用戶頭像"""
    return await UserService.update_user_avatar(db, current_user.id, avatar_data)

@router.delete("/avatar", response_model=Dict[str, str])
async def delete_avatar(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """刪除用戶頭像"""
    return await UserService.delete_user_avatar(db, current_user.id)

@router.post("/change-password", response_model=Dict[str, str])
async def change_password(
    password_data: PasswordChange,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """變更用戶密碼"""
    return await UserService.change_password(db, current_user.id, password_data)

@router.delete("/delete-account", response_model=Dict[str, str])
async def delete_account(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """刪除用戶帳號"""
    return await UserService.delete_user_account(db, current_user.id)

@router.post("/resend-email-verification", response_model=Dict[str, str])
async def resend_email_verification(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """重新發送email驗證"""
    return await AuthService.resend_verification_email(db, current_user.email)

@router.get("/check-email-verification", response_model=Dict[str, bool])
async def check_email_verification(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """檢查email驗證狀態"""
    return {"verified": current_user.email_verified} 
