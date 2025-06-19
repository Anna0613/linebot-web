"""
Bot 管理 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.bot import BotCreate, BotUpdate, BotResponse, FlexMessageCreate, FlexMessageResponse, BotCodeCreate, BotCodeResponse
from app.services.bot_service import BotService

router = APIRouter()

@router.post("/", response_model=BotResponse)
async def create_bot(
    bot_data: BotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """建立新的 Bot"""
    return BotService.create_bot(db, current_user.id, bot_data)

@router.get("/", response_model=List[BotResponse])
async def get_bots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得用戶的所有 Bot"""
    return BotService.get_user_bots(db, current_user.id)

@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得特定 Bot"""
    return BotService.get_bot(db, bot_id, current_user.id)

@router.put("/{bot_id}", response_model=BotResponse)
async def update_bot(
    bot_id: str,
    bot_data: BotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新 Bot"""
    return BotService.update_bot(db, bot_id, current_user.id, bot_data)

@router.delete("/{bot_id}")
async def delete_bot(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """刪除 Bot"""
    return BotService.delete_bot(db, bot_id, current_user.id)

# Flex 訊息相關路由
@router.post("/messages", response_model=FlexMessageResponse)
async def create_flex_message(
    message_data: FlexMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """建立 Flex 訊息"""
    return BotService.create_flex_message(db, current_user.id, message_data)

@router.get("/messages", response_model=List[FlexMessageResponse])
async def get_flex_messages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得用戶的所有 Flex 訊息"""
    return BotService.get_user_flex_messages(db, current_user.id)

# Bot 程式碼相關路由
@router.post("/codes", response_model=BotCodeResponse)
async def create_bot_code(
    code_data: BotCodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """建立 Bot 程式碼"""
    return BotService.create_bot_code(db, current_user.id, code_data) 