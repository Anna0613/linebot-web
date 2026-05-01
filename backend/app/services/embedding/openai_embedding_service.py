"""
OpenAI embedding service.

This module is the only runtime provider for knowledge-base embeddings. It does
not fall back to Gemini, sentence-transformers, or any local model.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import List, Optional, Sequence

from app.config import settings

logger = logging.getLogger(__name__)


class OpenAIEmbeddingService:
    """Thin async wrapper around OpenAI embeddings API."""

    _client = None

    @classmethod
    def default_model(cls) -> str:
        return settings.EMBEDDING_MODEL

    @classmethod
    def dimensions(cls) -> int:
        return int(settings.EMBEDDING_DIMENSIONS)

    @classmethod
    def _get_client(cls):
        if cls._client is not None:
            return cls._client

        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is required for OpenAI embeddings")

        try:
            from openai import AsyncOpenAI
        except ImportError as exc:  # pragma: no cover - depends on runtime env
            raise RuntimeError("openai package is required for OpenAI embeddings") from exc

        cls._client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=float(settings.EMBEDDING_TIMEOUT_SECONDS),
            max_retries=0,
        )
        return cls._client

    @staticmethod
    def _prepare_text(text: str) -> str:
        cleaned = (text or "").replace("\n", " ").strip()
        if not cleaned:
            raise ValueError("Cannot embed empty text")
        return cleaned

    @classmethod
    def _validate_embedding(cls, embedding: Sequence[float], model: str) -> List[float]:
        vector = [float(value) for value in embedding]
        expected = cls.dimensions()
        if len(vector) != expected:
            raise ValueError(
                f"OpenAI embedding dimension mismatch for {model}: "
                f"expected {expected}, got {len(vector)}"
            )
        return vector

    @classmethod
    async def embed_one(cls, text: str, model_name: Optional[str] = None) -> List[float]:
        embeddings = await cls.embed_many([text], model_name=model_name)
        return embeddings[0]

    @classmethod
    async def embed_many(
        cls,
        texts: Sequence[str],
        model_name: Optional[str] = None,
        batch_size: Optional[int] = None,
    ) -> List[List[float]]:
        if not texts:
            return []

        model = model_name or cls.default_model()
        if model != settings.EMBEDDING_MODEL:
            logger.warning(
                "Ignoring requested embedding model %s; using configured OpenAI model %s",
                model,
                settings.EMBEDDING_MODEL,
            )
            model = settings.EMBEDDING_MODEL

        prepared_texts = [cls._prepare_text(text) for text in texts]
        effective_batch_size = max(
            1,
            int(batch_size or settings.EMBEDDING_BATCH_SIZE),
        )

        results: List[List[float]] = []
        for start in range(0, len(prepared_texts), effective_batch_size):
            batch = prepared_texts[start : start + effective_batch_size]
            batch_embeddings = await cls._embed_batch(batch, model)
            results.extend(batch_embeddings)

        if len(results) != len(prepared_texts):
            raise RuntimeError(
                f"OpenAI embeddings returned {len(results)} vectors for "
                f"{len(prepared_texts)} inputs"
            )
        return results

    @classmethod
    async def _embed_batch(cls, texts: Sequence[str], model: str) -> List[List[float]]:
        client = cls._get_client()
        max_retries = max(0, int(settings.EMBEDDING_MAX_RETRIES))
        start_time = time.perf_counter()

        for attempt in range(max_retries + 1):
            try:
                response = await client.embeddings.create(
                    input=list(texts),
                    model=model,
                    encoding_format="float",
                )
                data = sorted(response.data, key=lambda item: item.index)
                embeddings = [cls._validate_embedding(item.embedding, model) for item in data]

                elapsed_ms = (time.perf_counter() - start_time) * 1000
                usage = getattr(response, "usage", None)
                logger.info(
                    "OpenAI embeddings completed: model=%s batch_size=%s elapsed_ms=%.2f "
                    "prompt_tokens=%s total_tokens=%s",
                    model,
                    len(texts),
                    elapsed_ms,
                    getattr(usage, "prompt_tokens", None),
                    getattr(usage, "total_tokens", None),
                )
                return embeddings

            except Exception as exc:
                if attempt >= max_retries:
                    logger.error(
                        "OpenAI embeddings failed after %s attempts: %s",
                        attempt + 1,
                        exc,
                    )
                    raise

                delay = min(2 ** attempt, 8)
                logger.warning(
                    "OpenAI embeddings attempt %s/%s failed: %s; retrying in %ss",
                    attempt + 1,
                    max_retries + 1,
                    exc,
                    delay,
                )
                await asyncio.sleep(delay)

        raise RuntimeError("OpenAI embeddings retry loop exited unexpectedly")
