"""
RAG (Retrieval-Augmented Generation) service.
Implements retrieval over Postgres+pgvector and generation via existing AIAnalysisService.
"""
from __future__ import annotations

import logging
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text as sql_text

from app.models.knowledge import KnowledgeChunk
from app.services.embedding_service import embed_text
from app.services.ai_analysis_service import AIAnalysisService

logger = logging.getLogger(__name__)


class RAGService:
    MIN_SIMILARITY = 0.7  # cosine similarity threshold
    TOP_K = 5

    @staticmethod
    async def retrieve(db: AsyncSession, bot_id: str, query: str) -> List[Tuple[KnowledgeChunk, float]]:
        """Retrieve top chunks across project and global scopes using cosine similarity."""
        emb = await embed_text(query)

        # pgvector cosine distance: embedding <=> query_embedding
        # distance = 1 - cosine_similarity
        # Filter by similarity >= MIN_SIMILARITY => distance <= (1 - MIN_SIMILARITY)
        max_distance = 1.0 - RAGService.MIN_SIMILARITY

        # Use a raw SQL to leverage vector operator with bound vector
        # Note: asyncpg supports list[float] parameter for vector
        sql = sql_text(
            """
            SELECT kc.*, (1 - (kc.embedding <=> :q)) AS score
            FROM knowledge_chunks kc
            WHERE (kc.bot_id = :bot_id OR kc.bot_id IS NULL)
              AND (kc.embedding <=> :q) <= :maxd
            ORDER BY kc.embedding <=> :q
            LIMIT :k
            """
        )

        rows = (await db.execute(sql, {"q": emb, "bot_id": bot_id, "maxd": max_distance, "k": RAGService.TOP_K})).mappings().all()
        items: List[Tuple[KnowledgeChunk, float]] = []
        for r in rows:
            # Build transient KnowledgeChunk-like object for return
            kc = KnowledgeChunk()
            kc.id = r["id"]
            kc.document_id = r["document_id"]
            kc.bot_id = r["bot_id"]
            kc.content = r["content"]
            kc.created_at = r["created_at"]
            kc.updated_at = r["updated_at"]
            items.append((kc, float(r["score"])) )
        return items

    @staticmethod
    async def generate_answer(query: str, contexts: List[str], *, provider: Optional[str] = None, model: Optional[str] = None) -> str:
        """Use existing AIAnalysisService to generate an answer with given contexts."""
        context_text = "\n\n".join([f"[片段{i+1}]\n{c}" for i, c in enumerate(contexts)])
        result = await AIAnalysisService.ask_ai(
            query,
            context_text=context_text,
            history=None,
            model=model,
            provider=provider,
            system_prompt=(
                "你是一個知識庫助理。僅根據提供的知識片段回答問題。"
                "若資訊不足或無關，請明確說明不知道，不要臆測。"
            ),
            max_tokens=512,
        )
        return result.get("answer", "")

    @staticmethod
    async def answer(db: AsyncSession, bot_id: str, query: str, *, provider: Optional[str] = None, model: Optional[str] = None) -> Optional[str]:
        try:
            items = await RAGService.retrieve(db, bot_id, query)
            if not items:
                return None
            contexts = [kc.content for kc, _ in items]
            return await RAGService.generate_answer(query, contexts, provider=provider, model=model)
        except Exception as e:
            logger.error(f"RAG 回答失敗: {e}")
            return None
