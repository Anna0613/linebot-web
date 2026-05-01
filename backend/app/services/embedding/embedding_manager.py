"""
Embedding manager compatibility layer.

The previous implementation loaded Gemini or local sentence-transformers
models. The migration makes OpenAI the only embedding provider while keeping
the public methods used elsewhere in the codebase.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import numpy as np

from app.config import settings
from app.services.embedding.openai_embedding_service import OpenAIEmbeddingService

logger = logging.getLogger(__name__)


class EmbeddingManager:
    """OpenAI-only embedding manager."""

    DEFAULT_MODEL = settings.EMBEDDING_MODEL

    SUPPORTED_MODELS = {
        settings.EMBEDDING_MODEL: {
            "name": settings.EMBEDDING_MODEL,
            "dimensions": int(settings.EMBEDDING_DIMENSIONS),
            "max_seq_length": None,
            "description": "OpenAI embeddings API",
            "performance": "api",
            "quality": "high",
            "multilingual": True,
            "type": "api",
        }
    }

    @classmethod
    def get_model_info(cls, model_name: Optional[str] = None) -> Dict[str, Any]:
        model_name = model_name or cls.DEFAULT_MODEL
        return cls.SUPPORTED_MODELS.get(model_name, cls.SUPPORTED_MODELS[cls.DEFAULT_MODEL])

    @classmethod
    def list_available_models(cls) -> List[Dict[str, Any]]:
        return [
            {
                "id": model_id,
                "name": config["name"],
                "dimensions": config["dimensions"],
                "max_seq_length": config["max_seq_length"],
                "description": config["description"],
                "performance": config["performance"],
                "quality": config["quality"],
                "multilingual": config["multilingual"],
            }
            for model_id, config in cls.SUPPORTED_MODELS.items()
        ]

    @classmethod
    async def embed_text(
        cls,
        text: str,
        model_name: Optional[str] = None,
        normalize_embeddings: bool = True,
    ) -> List[float]:
        return await OpenAIEmbeddingService.embed_one(text, model_name=model_name)

    @classmethod
    async def embed_texts_adaptive_batch(
        cls,
        texts: List[str],
        model_name: Optional[str] = None,
        base_batch_size: int = 64,
        min_batch_size: int = 8,
        max_batch_size: int = 128,
        normalize_embeddings: bool = True,
        show_progress: bool = False,
    ) -> List[List[float]]:
        batch_size = max(min_batch_size, min(max_batch_size, int(base_batch_size)))
        return await OpenAIEmbeddingService.embed_many(
            texts,
            model_name=model_name,
            batch_size=batch_size,
        )

    @classmethod
    async def embed_texts_batch(
        cls,
        texts: List[str],
        model_name: Optional[str] = None,
        batch_size: int = 64,
        normalize_embeddings: bool = True,
        show_progress: bool = False,
    ) -> List[List[float]]:
        return await OpenAIEmbeddingService.embed_many(
            texts,
            model_name=model_name,
            batch_size=batch_size,
        )

    @classmethod
    def calculate_similarity(
        cls,
        embedding1: List[float],
        embedding2: List[float],
        method: str = "cosine",
    ) -> float:
        emb1 = np.array(embedding1)
        emb2 = np.array(embedding2)

        if method == "cosine":
            dot_product = np.dot(emb1, emb2)
            norm1 = np.linalg.norm(emb1)
            norm2 = np.linalg.norm(emb2)
            if norm1 == 0 or norm2 == 0:
                return 0.0
            return float(dot_product / (norm1 * norm2))

        if method == "euclidean":
            distance = np.linalg.norm(emb1 - emb2)
            return float(1.0 / (1.0 + distance))

        if method == "dot_product":
            return float(np.dot(emb1, emb2))

        raise ValueError(f"不支援的相似度計算方法: {method}")

    @classmethod
    def get_embedding_dimensions(cls, model_name: Optional[str] = None) -> int:
        return int(settings.EMBEDDING_DIMENSIONS)

    @classmethod
    def clear_cache(cls):
        logger.info("OpenAI embedding manager has no local model cache to clear")

    @classmethod
    def get_cache_info(cls) -> Dict[str, Any]:
        return {
            "provider": settings.EMBEDDING_PROVIDER,
            "model": settings.EMBEDDING_MODEL,
            "dimensions": int(settings.EMBEDDING_DIMENSIONS),
            "local_models_loaded": 0,
        }

    @classmethod
    def get_embedding_status(cls) -> Dict[str, Any]:
        return {
            "provider": settings.EMBEDDING_PROVIDER,
            "default_model": settings.EMBEDDING_MODEL,
            "dimensions": int(settings.EMBEDDING_DIMENSIONS),
            "api_key_configured": bool(settings.OPENAI_API_KEY),
        }
