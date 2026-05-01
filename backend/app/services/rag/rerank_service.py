"""
Rerank compatibility module.

Local CrossEncoder reranking was removed as part of the OpenAI embedding
migration. These classes keep old imports from failing while returning the
original vector-search order.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Tuple

logger = logging.getLogger(__name__)


class RerankService:
    """No-op rerank service."""

    DEFAULT_MODEL = "disabled"
    SUPPORTED_MODELS: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def list_available_models(cls) -> List[Dict[str, Any]]:
        return []

    @classmethod
    async def rerank(
        cls,
        query: str,
        documents: List[Tuple[str, float]],
        model_name: str = None,
        top_k: int = 5,
        score_threshold: float = 0.0,
    ) -> List[Tuple[str, float]]:
        logger.info("Local rerank is disabled; returning original document order")
        return documents[:top_k]

    @classmethod
    async def rerank_with_metadata(
        cls,
        query: str,
        documents: List[Dict[str, Any]],
        content_field: str = "content",
        model_name: str = None,
        top_k: int = 5,
        score_threshold: float = 0.0,
    ) -> List[Dict[str, Any]]:
        logger.info("Local rerank is disabled; returning original document order")
        return documents[:top_k]

    @classmethod
    async def calculate_relevance_score(
        cls,
        query: str,
        document: str,
        model_name: str = None,
    ) -> float:
        return 0.0

    @classmethod
    def get_model_info(cls, model_name: str = None) -> Dict[str, Any]:
        return {}


class HybridRanker:
    """No-op hybrid ranker preserving vector score order."""

    @staticmethod
    def combine_scores(
        vector_score: float,
        rerank_score: float,
        vector_weight: float = 1.0,
        rerank_weight: float = 0.0,
    ) -> float:
        return vector_score

    @staticmethod
    async def hybrid_rerank(
        query: str,
        documents: List[Tuple[str, float]],
        rerank_model: str = None,
        vector_weight: float = 1.0,
        rerank_weight: float = 0.0,
        top_k: int = 5,
    ) -> List[Tuple[str, float, Dict[str, float]]]:
        return [
            (
                content,
                vector_score,
                {
                    "vector_score": vector_score,
                    "rerank_score": 0.0,
                    "combined_score": vector_score,
                },
            )
            for content, vector_score in documents[:top_k]
        ]
