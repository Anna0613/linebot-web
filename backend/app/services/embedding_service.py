"""
Embedding service using sentence-transformers
"""
from __future__ import annotations

import asyncio
import logging
from functools import lru_cache
from typing import List, Sequence

logger = logging.getLogger(__name__)


class _ModelHolder:
    model = None


def _load_model():
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
    except Exception as e:  # pragma: no cover
        raise ImportError("請安裝 sentence-transformers 套件以使用向量化功能") from e

    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    logger.info(f"載入嵌入模型: {model_name}")
    _ModelHolder.model = SentenceTransformer(model_name)


@lru_cache(maxsize=4096)
def _embed_sync_cached(text: str) -> List[float]:
    if _ModelHolder.model is None:
        _load_model()
    emb = _ModelHolder.model.encode([text], normalize_embeddings=True)[0]
    return emb.tolist()  # type: ignore


async def embed_text(text: str) -> List[float]:
    """Embed a single text with caching."""
    return await asyncio.to_thread(_embed_sync_cached, text)


async def embed_texts(texts: Sequence[str]) -> List[List[float]]:
    """Batch embed texts. Uses threads; model call is CPU-bound."""
    if _ModelHolder.model is None:
        await asyncio.to_thread(_load_model)

    # Keep semantics same as single: normalize
    def _run() -> List[List[float]]:
        embs = _ModelHolder.model.encode(list(texts), normalize_embeddings=True)  # type: ignore
        return [e.tolist() for e in embs]

    return await asyncio.to_thread(_run)

