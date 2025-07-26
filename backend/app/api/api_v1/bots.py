"""
Bot 管理 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.bot import (
    BotCreate, BotUpdate, BotResponse, FlexMessageCreate, FlexMessageResponse, FlexMessageUpdate, FlexMessageSummary,
    BotCodeCreate, BotCodeResponse, VisualEditorData, VisualEditorResponse, BotSummary,
    LogicTemplateCreate, LogicTemplateUpdate, LogicTemplateResponse, LogicTemplateSummary
)
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

# 視覺化編輯器相關路由
@router.get("/visual-editor/summary", response_model=List[BotSummary])
async def get_user_bots_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得用戶 Bot 摘要列表 - 用於下拉選單"""
    return BotService.get_user_bots_summary(db, current_user.id)

@router.post("/{bot_id}/visual-editor/save", response_model=VisualEditorResponse)
async def save_visual_editor_data(
    bot_id: str,
    editor_data: VisualEditorData,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """儲存視覺化編輯器數據"""
    return BotService.save_visual_editor_data(db, bot_id, current_user.id, editor_data)

@router.get("/{bot_id}/visual-editor", response_model=VisualEditorResponse)
async def get_visual_editor_data(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得視覺化編輯器數據"""
    return BotService.get_visual_editor_data(db, bot_id, current_user.id)

# 邏輯模板相關路由
@router.get("/{bot_id}/logic-templates", response_model=List[LogicTemplateResponse])
async def get_bot_logic_templates(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得Bot的所有邏輯模板"""
    return BotService.get_bot_logic_templates(db, bot_id, current_user.id)

@router.get("/{bot_id}/logic-templates/summary", response_model=List[LogicTemplateSummary])
async def get_bot_logic_templates_summary(
    bot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得Bot邏輯模板摘要列表 - 用於下拉選單"""
    return BotService.get_bot_logic_templates_summary(db, bot_id, current_user.id)

@router.post("/{bot_id}/logic-templates", response_model=LogicTemplateResponse)
async def create_logic_template(
    bot_id: str,
    template_data: LogicTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """創建邏輯模板"""
    # 確保bot_id一致
    template_data.bot_id = bot_id
    return BotService.create_logic_template(db, current_user.id, template_data)

@router.get("/logic-templates/{template_id}", response_model=LogicTemplateResponse)
async def get_logic_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得特定邏輯模板"""
    return BotService.get_logic_template(db, template_id, current_user.id)

@router.put("/logic-templates/{template_id}", response_model=LogicTemplateResponse)
async def update_logic_template(
    template_id: str,
    template_data: LogicTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新邏輯模板"""
    return BotService.update_logic_template(db, template_id, current_user.id, template_data)

@router.delete("/logic-templates/{template_id}")
async def delete_logic_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """刪除邏輯模板"""
    return BotService.delete_logic_template(db, template_id, current_user.id)

@router.post("/logic-templates/{template_id}/activate")
async def activate_logic_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """激活邏輯模板（設為活躍狀態）"""
    return BotService.activate_logic_template(db, template_id, current_user.id)

# FLEX 模板增強路由
@router.put("/messages/{message_id}", response_model=FlexMessageResponse)
async def update_flex_message(
    message_id: str,
    message_data: FlexMessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新 Flex 訊息"""
    return BotService.update_flex_message(db, message_id, current_user.id, message_data)

@router.delete("/messages/{message_id}")
async def delete_flex_message(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """刪除 Flex 訊息"""
    return BotService.delete_flex_message(db, message_id, current_user.id)

@router.get("/messages/summary", response_model=List[FlexMessageSummary])
async def get_flex_messages_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """取得用戶FLEX訊息摘要列表 - 用於下拉選單"""
    return BotService.get_user_flex_messages_summary(db, current_user.id)

 