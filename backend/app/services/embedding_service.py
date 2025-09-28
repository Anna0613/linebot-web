"""
Embedding service using sentence-transformers
升級版本：使用新的 EmbeddingManager 提供更好的模型管理和效能
"""
from __future__ import annotations

import asyncio
import logging
from functools import lru_cache
from typing import List, Sequence, Optional

from app.services.embedding_manager import EmbeddingManager

logger = logging.getLogger(__name__)


# 舊的實作已移除，所有功能已轉移到 EmbeddingManager


# === 新的 API（使用 EmbeddingManager）===
async def embed_text(text: str, model_name: Optional[str] = None) -> List[float]:
    """
    嵌入單一文本（升級版本）

    Args:
        text: 要嵌入的文本
        model_name: 模型名稱，預設使用 all-mpnet-base-v2

    Returns:
        嵌入向量
    """
    return await EmbeddingManager.embed_text(text, model_name)


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
    """獲取快取資訊"""
    return EmbeddingManager.get_cache_info()


def clear_cache():
    """清除快取"""
    EmbeddingManager.clear_cache()

