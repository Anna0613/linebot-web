"""
用戶管理 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict
from uuid import UUID
from sqlalchemy import text

from app.db.database_async import get_async_db
from app.dependencies import get_current_user_async, get_db_primary
from app.models.user import User
from app.schemas.user import Feedback, UserProfile, UserUpdate, AvatarUpload
from app.schemas.auth import PasswordChange
from app.services.auth.user_service import UserService

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

@router.get("/check-email-verification", response_model=Dict[str, bool])
async def check_email_verification(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async)
):
    """檢查email驗證狀態"""
    return {"verified": current_user.email_verified} 


@router.put("/feedback/{feedback_id}", status_code=201)
async def submit_feedback(feedback_id: UUID, feedback: Feedback, user: User = Depends(get_current_user_async),
                          db: AsyncSession = Depends(get_db_primary)):
    params = {**feedback.model_dump(), "id": feedback_id, "user_id": user.id}
    saved = await db.scalar(text("""
        INSERT INTO user_feedback(user_id,id,category,message,contact_name,contact_email)
        VALUES(:user_id,:id,:category,:message,:contact_name,:contact_email)
        ON CONFLICT(user_id,id) DO UPDATE SET id=excluded.id
        WHERE (user_feedback.category, user_feedback.message, user_feedback.contact_name, user_feedback.contact_email)
              IS NOT DISTINCT FROM (excluded.category, excluded.message, excluded.contact_name, excluded.contact_email)
        RETURNING id
    """), params)
    if saved is None:
        raise HTTPException(409, "此回饋識別碼已用於其他內容")
    await db.commit()
    return {"id": feedback_id}
