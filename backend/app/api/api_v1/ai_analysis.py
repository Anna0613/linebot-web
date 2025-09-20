"""
AI 分析 API 路由
提供針對單一用戶歷史對話的 AI 問答能力（Google Gemini）。
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.bot import Bot
from app.models.user import User
from app.schemas.ai import AIQueryRequest, AIQueryResponse
from app.services.ai_analysis_service import AIAnalysisService
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{bot_id}/users/{line_user_id}/ai/query", response_model=AIQueryResponse)
async def ai_query_user(
    bot_id: str,
    line_user_id: str,
    payload: AIQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """對指定用戶的歷史對話進行 AI 分析與問答。"""

    # 驗證 Bot 所有權
    def _get_bot():
        return db.query(Bot).filter(Bot.id == bot_id, Bot.user_id == current_user.id).first()

    bot = await asyncio.to_thread(_get_bot)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")

    # 基本設定檢查
    gemini_key = getattr(settings, "GEMINI_API_KEY", "")
    if not gemini_key:
        raise HTTPException(status_code=400, detail="後端未配置 GEMINI_API_KEY，請先設定 .env")

    try:
        context_text = await AIAnalysisService.build_user_context(
            bot_id,
            line_user_id,
            time_range_days=payload.time_range_days,
            max_messages=payload.max_messages,
        )

        answer = await AIAnalysisService.ask_gemini(
            payload.question,
            context_text=context_text,
            history=[t.model_dump() for t in (payload.history or [])],
        )

        return AIQueryResponse(
            answer=answer,
            model=getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash"),
            usage_note="此回應依據 MongoDB 對話歷史生成，僅供客服與營運決策參考。",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI 分析失敗: {e}")
        raise HTTPException(status_code=500, detail=f"AI 分析失敗: {str(e)}")

