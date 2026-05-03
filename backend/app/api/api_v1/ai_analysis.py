"""
AI 分析 API 路由
提供針對單一用戶歷史對話的 AI 問答能力（Google Gemini）。
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database_async import get_async_db
from app.dependencies import get_current_user_async
from app.models.bot import Bot
from app.models.user import User
from app.schemas.ai import AIQueryRequest, AIQueryResponse, AIModelsResponse, AIModelInfo
from app.services.ai.ai_analysis_service import AIAnalysisService
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{bot_id}/users/{line_user_id}/ai/query", response_model=AIQueryResponse)
async def ai_query_user(
    bot_id: str,
    line_user_id: str,
    payload: AIQueryRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user_async),
) -> Any:
    """對指定用戶的歷史對話進行 AI 分析與問答。"""

    # 驗證 Bot 所有權
    stmt = select(Bot).where(Bot.id == bot_id, Bot.user_id == current_user.id)
    result = await db.execute(stmt)
    bot = result.scalars().first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot 不存在或無權限訪問")

    provider = AIAnalysisService.ANALYSIS_PROVIDER
    model = AIAnalysisService.ANALYSIS_MODEL

    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=400, detail="後端未配置 GROQ_API_KEY，請先設定 .env")

    try:
        history = AIAnalysisService._trim_analysis_history(
            [t.model_dump() for t in (payload.history or [])]
        )

        context_result = await AIAnalysisService.build_user_context(
            bot_id,
            line_user_id,
            question=payload.question,
            history=history,
            model=model,
            system_prompt=AIAnalysisService.ANALYSIS_SYSTEM_PROMPT,
            max_output_tokens=AIAnalysisService.ANALYSIS_MAX_OUTPUT_TOKENS,
            return_metadata=True,
        )
        if isinstance(context_result, str):
            context_text = context_result
            context_metadata = {
                "context_policy": "auto_token_budget",
                "provider": provider,
                "model": model,
                "error": context_result,
            }
        else:
            context_text = context_result.context_text
            context_metadata = context_result.metadata

        result = await AIAnalysisService.ask_ai(
            payload.question,
            context_text=context_text,
            history=history,
            model=model,
            provider=provider,
            system_prompt=AIAnalysisService.ANALYSIS_SYSTEM_PROMPT,
            max_tokens=AIAnalysisService.ANALYSIS_MAX_OUTPUT_TOKENS,
            context_kind="user_context",
        )

        return AIQueryResponse(
            answer=result["answer"],
            model=result["model"],
            provider=result["provider"],
            usage_note="此回應依據 MongoDB 對話歷史生成，僅供客服與營運決策參考。",
            context_metadata=context_metadata,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI 分析失敗: {e}")
        raise HTTPException(status_code=500, detail=f"AI 分析失敗: {str(e)}")


@router.get("/ai/models", response_model=AIModelsResponse)
async def get_ai_models(
    provider: Optional[str] = Query(default=None, description="指定提供商，如 groq 或 gemini"),
    current_user: User = Depends(get_current_user_async),
) -> Any:
    """取得可用的 AI 模型列表。"""

    try:
        models_data = AIAnalysisService.get_available_models(provider)
        models = [AIModelInfo(**model) for model in models_data]

        return AIModelsResponse(
            models=models,
            current_provider=provider or settings.AI_PROVIDER
        )
    except Exception as e:
        logger.error(f"取得 AI 模型列表失敗: {e}")
        raise HTTPException(status_code=500, detail=f"取得 AI 模型列表失敗: {str(e)}")


@router.delete("/{bot_id}/users/{line_user_id}/ai/history")
async def clear_ai_conversation_history(
    bot_id: str,
    line_user_id: str,
    current_user: dict = Depends(get_current_user_async)
):
    """
    清除指定用戶的 AI 分析快取

    注意：此操作僅清除 AI 分析對話的快取，不影響 MongoDB 中的原始對話記錄
    """
    try:
        # 清除 Redis 快取中的 AI 分析上下文快取（改為非同步 Redis 方案）
        from app.config.redis_config import CacheService as AsyncCache, redis_manager

        if not redis_manager.is_connected:
            logger.warning("Redis 未連接，跳過快取清除")
            message = "AI 分析快取已清除（快取未啟用）"
        else:
            cache_key = f"conversation:{bot_id}:{line_user_id}"
            deleted = await AsyncCache.delete(cache_key)
            if deleted:
                logger.info(f"已清除用戶 AI 分析快取: {bot_id}:{line_user_id}")
                message = "AI 分析快取已清除"
            else:
                logger.warning(f"快取鍵不存在或清除失敗: {bot_id}:{line_user_id}")
                message = "AI 分析快取已清除（無快取或清除失敗）"

        return {"success": True, "message": message}

    except Exception as e:
        logger.error(f"清除 AI 分析快取失敗: {e}")
        raise HTTPException(status_code=500, detail=f"清除 AI 分析快取失敗: {str(e)}")
