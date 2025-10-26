"""
Embedding service using sentence-transformers
升級版本：使用新的 EmbeddingManager 提供更好的模型管理和效能
優化版本：添加查詢快取以提升效能
"""
from __future__ import annotations

import asyncio
import logging
from functools import lru_cache
from typing import List, Sequence, Optional

from app.services.embedding_manager import EmbeddingManager
from app.services.embedding_cache import get_embedding_cache

logger = logging.getLogger(__name__)


# 舊的實作已移除，所有功能已轉移到 EmbeddingManager


# === 新的 API（使用 EmbeddingManager）===
async def embed_text(text: str, model_name: Optional[str] = None, use_cache: bool = True) -> List[float]:
    """
    嵌入單一文本（升級版本，支援快取）

    Args:
        text: 要嵌入的文本
        model_name: 模型名稱，預設使用 all-mpnet-base-v2
        use_cache: 是否使用快取（預設為 True）

    Returns:
        嵌入向量
    """
    logger.info(f"📝 [embed_text_service] 收到請求 - 文本長度: {len(text)}, model: {model_name}, use_cache: {use_cache}")

    # 如果啟用快取，先嘗試從快取獲取
    if use_cache:
        logger.info(f"🔍 [embed_text_service] 檢查快取...")
        cache = get_embedding_cache()
        model_name_key = model_name or EmbeddingManager.DEFAULT_MODEL
        cached_embedding = cache.get(text, model_name_key)

        if cached_embedding is not None:
            logger.info(f"✅ [embed_text_service] 快取命中: {text[:50]}...")
            return cached_embedding

        logger.info(f"⚠️ [embed_text_service] 快取未命中")

    # 快取未命中，生成新的 embedding
    logger.info(f"🚀 [embed_text_service] 調用 EmbeddingManager.embed_text...")
    import time
    start_time = time.time()
    embedding = await EmbeddingManager.embed_text(text, model_name)
    elapsed_ms = (time.time() - start_time) * 1000
    logger.info(f"✅ [embed_text_service] EmbeddingManager.embed_text 完成，耗時: {elapsed_ms:.2f}ms")

    # 存入快取
    if use_cache:
        logger.info(f"💾 [embed_text_service] 存入快取...")
        cache = get_embedding_cache()
        model_name_key = model_name or EmbeddingManager.DEFAULT_MODEL
        cache.set(text, model_name_key, embedding)
        logger.info(f"✅ [embed_text_service] 快取已更新")

    return embedding


async def embed_texts(
    texts: Sequence[str],
    model_name: Optional[str] = None,
    batch_size: int = 32,
    adaptive: bool = True
) -> List[List[float]]:
    """
    批次嵌入文本（升級版本）

    Args:
        texts: 要嵌入的文本列表
        model_name: 模型名稱，預設使用 all-mpnet-base-v2
        batch_size: 批次大小（當 adaptive=False 時使用）
        adaptive: 是否使用自適應批次大小

    Returns:
        嵌入向量列表
    """
    if adaptive:
        return await EmbeddingManager.embed_texts_adaptive_batch(
            list(texts),
            model_name=model_name,
            base_batch_size=batch_size
        )
    else:
        return await EmbeddingManager.embed_texts_batch(
            list(texts),
            model_name=model_name,
            batch_size=batch_size
        )


# === 新增的便利函數 ===
def get_embedding_dimensions(model_name: Optional[str] = None) -> int:
    """獲取嵌入維度"""
    return EmbeddingManager.get_embedding_dimensions(model_name)


def list_available_models() -> List[dict]:
    """列出可用的嵌入模型"""
    return EmbeddingManager.list_available_models()


def get_cache_info() -> dict:
    """獲取快取資訊（包含 embedding 快取和模型快取）"""
    embedding_cache_stats = get_embedding_cache().get_stats()
    model_cache_stats = EmbeddingManager.get_cache_info()

    return {
        'embedding_cache': embedding_cache_stats,
        'model_cache': model_cache_stats
    }


def clear_cache():
    """清除所有快取（包含 embedding 快取和模型快取）"""
    from app.services.embedding_cache import clear_embedding_cache
    clear_embedding_cache()
    EmbeddingManager.clear_cache()
    logger.info("已清除所有 embedding 相關快取")

