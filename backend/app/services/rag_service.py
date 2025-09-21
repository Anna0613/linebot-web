"""
RAG (Retrieval-Augmented Generation) service.
Implements retrieval over Postgres+pgvector and generation via existing AIAnalysisService.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text as sql_text

from app.models.knowledge import KnowledgeChunk
from app.services.embedding_service import embed_text
from app.services.ai_analysis_service import AIAnalysisService
from app.services.rerank_service import RerankService, HybridRanker
from app.services.hybrid_search_service import HybridSearchService
from app.services.context_manager import global_context_manager, MessageRole

logger = logging.getLogger(__name__)


class RAGService:
    MIN_SIMILARITY = 0.7  # default cosine similarity threshold
    TOP_K = 5  # default top K

    @staticmethod
    async def retrieve(
        db: AsyncSession,
        bot_id: str,
        query: str,
        *,
        threshold: Optional[float] = None,
        top_k: Optional[int] = None,
        model_name: Optional[str] = None
    ) -> List[Tuple[KnowledgeChunk, float]]:
        """
        Retrieve top chunks across project and global scopes using cosine similarity.
        支援新的嵌入模型和向後相容性。
        """
        # 使用指定的模型生成查詢嵌入
        emb = await embed_text(query, model_name)

        # 轉換為 pgvector 格式字串
        embedding_str = "[" + ",".join(map(str, emb)) + "]"

        # pgvector cosine distance: embedding <=> query_embedding
        # distance = 1 - cosine_similarity
        # Filter by similarity >= MIN_SIMILARITY => distance <= (1 - MIN_SIMILARITY)
        th = RAGService.MIN_SIMILARITY if threshold is None else max(0.0, min(1.0, float(threshold)))
        k = RAGService.TOP_K if top_k is None else max(1, int(top_k))
        max_distance = 1.0 - th

        # 單一 768 維向量欄位 embedding（pgvector）
        sql = sql_text(
            """
            SELECT kc.*,
                   (1 - (kc.embedding <=> CAST(:q AS vector))) AS score
            FROM knowledge_chunks kc
            WHERE (kc.bot_id = :bot_id OR kc.bot_id IS NULL)
              AND (kc.embedding <=> CAST(:q AS vector)) <= :maxd
            ORDER BY (kc.embedding <=> CAST(:q AS vector))
            LIMIT :k
            """
        )

        rows = (await db.execute(sql, {"q": embedding_str, "bot_id": bot_id, "maxd": max_distance, "k": k})).mappings().all()
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
            items.append((kc, float(r["score"])))
        return items

    @staticmethod
    async def retrieve_with_rerank(
        db: AsyncSession,
        bot_id: str,
        query: str,
        *,
        threshold: Optional[float] = None,
        initial_k: int = 20,
        final_k: int = 5,
        rerank_model: Optional[str] = None,
        use_hybrid: bool = True,
        model_name: Optional[str] = None
    ) -> List[Tuple[KnowledgeChunk, float]]:
        """
        帶重排序的檢索方法

        Args:
            db: 資料庫會話
            bot_id: Bot ID
            query: 查詢文本
            threshold: 相似度門檻
            initial_k: 初始檢索數量（重排序前）
            final_k: 最終返回數量（重排序後）
            rerank_model: 重排序模型名稱
            use_hybrid: 是否使用混合排序（結合向量和重排序分數）
            model_name: 嵌入模型名稱

        Returns:
            重排序後的知識塊列表
        """
        # 1. 初始檢索更多結果
        initial_results = await RAGService.retrieve(
            db, bot_id, query,
            threshold=threshold,
            top_k=initial_k,
            model_name=model_name
        )

        if len(initial_results) <= final_k:
            # 如果初始結果不多，直接返回
            return initial_results[:final_k]

        # 2. 準備重排序數據
        documents = [(kc.content, score) for kc, score in initial_results]

        try:
            if use_hybrid:
                # 使用混合重排序
                hybrid_results = await HybridRanker.hybrid_rerank(
                    query=query,
                    documents=documents,
                    rerank_model=rerank_model,
                    top_k=final_k
                )

                # 重新組織結果
                final_results = []
                for content, combined_score, score_details in hybrid_results:
                    for kc, _ in initial_results:
                        if kc.content == content:
                            # 添加分數詳情到知識塊
                            kc.score_details = score_details
                            final_results.append((kc, combined_score))
                            break

                return final_results

            else:
                # 使用純重排序
                reranked = await RerankService.rerank(
                    query=query,
                    documents=documents,
                    model_name=rerank_model,
                    top_k=final_k
                )

                # 重新組織結果
                final_results = []
                for content, rerank_score in reranked:
                    for kc, original_score in initial_results:
                        if kc.content == content:
                            # 添加原始分數資訊
                            kc.original_score = original_score
                            final_results.append((kc, rerank_score))
                            break

                return final_results

        except Exception as e:
            logger.warning(f"重排序失敗，返回原始結果: {e}")
            return initial_results[:final_k]

    @staticmethod
    async def hybrid_search(
        db: AsyncSession,
        bot_id: str,
        query: str,
        *,
        vector_weight: float = 0.7,
        bm25_weight: float = 0.3,
        top_k: int = 5,
        vector_threshold: float = 0.7,
        model_name: Optional[str] = None
    ) -> List[Tuple[KnowledgeChunk, float]]:
        """
        混合搜尋方法

        Args:
            db: 資料庫會話
            bot_id: Bot ID
            query: 查詢文本
            vector_weight: 向量搜尋權重
            bm25_weight: BM25 搜尋權重
            top_k: 返回結果數量
            vector_threshold: 向量相似度門檻
            model_name: 嵌入模型名稱

        Returns:
            混合搜尋結果
        """
        try:
            hybrid_service = HybridSearchService()
            results = await hybrid_service.hybrid_search(
                db=db,
                bot_id=bot_id,
                query=query,
                vector_weight=vector_weight,
                bm25_weight=bm25_weight,
                top_k=top_k,
                vector_threshold=vector_threshold,
                model_name=model_name
            )

            # 轉換為標準格式
            return [(chunk, score) for chunk, score, _ in results]

        except Exception as e:
            logger.warning(f"混合搜尋失敗，回退到向量搜尋: {e}")
            return await RAGService.retrieve(
                db, bot_id, query,
                threshold=vector_threshold,
                top_k=top_k,
                model_name=model_name
            )

    @staticmethod
    async def generate_answer(
        query: str,
        contexts: List[str],
        *,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        history: Optional[List[dict]] = None,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Use existing AIAnalysisService to generate an answer with given contexts."""
        context_text = "\n\n".join([f"[片段{i+1}]\n{c}" for i, c in enumerate(contexts)])
        result = await AIAnalysisService.ask_ai(
            query,
            context_text=context_text,
            history=history,
            model=model,
            provider=provider,
            system_prompt=(
                system_prompt
                or (
                    "你是一個對話助理。若提供了知識片段，請優先引用並準確回答；"
                    "若未提供或不足，也可依一般常識與推理能力完整作答。"
                )
            ),
            max_tokens=None,  # 移除硬編碼限制，讓 Groq 服務自動計算合適的 max_tokens
        )
        answer = (result or {}).get("answer", "")
        answer = (answer or "").strip()
        if not answer:
            answer = "我在這裡，請告訴我您的問題。"
        return answer

    @staticmethod
    async def answer(
        db: AsyncSession,
        bot_id: str,
        query: str,
        *,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        threshold: Optional[float] = None,
        top_k: Optional[int] = None,
        line_user_id: Optional[str] = None,
        history_messages: Optional[int] = None,
        system_prompt: Optional[str] = None,
        use_rerank: bool = True,
        rerank_model: Optional[str] = None,
        embedding_model: Optional[str] = None,
        use_hybrid: bool = False,
        vector_weight: float = 0.7,
        bm25_weight: float = 0.3,
    ) -> Optional[str]:
        try:
            # 選擇檢索方法
            if use_hybrid:
                # 使用混合搜尋
                items = await RAGService.hybrid_search(
                    db, bot_id, query,
                    vector_weight=vector_weight,
                    bm25_weight=bm25_weight,
                    top_k=top_k or RAGService.TOP_K,
                    vector_threshold=threshold or RAGService.MIN_SIMILARITY,
                    model_name=embedding_model
                )
            elif use_rerank:
                # 使用重排序
                items = await RAGService.retrieve_with_rerank(
                    db, bot_id, query,
                    threshold=threshold,
                    final_k=top_k or RAGService.TOP_K,
                    rerank_model=rerank_model,
                    model_name=embedding_model
                )
            else:
                # 使用基本向量搜尋
                items = await RAGService.retrieve(
                    db, bot_id, query,
                    threshold=threshold,
                    top_k=top_k,
                    model_name=embedding_model
                )

            contexts = [kc.content for kc, _ in items] if items else []
            # 構建最近對話歷史（可選）
            hist: Optional[List[dict]] = None
            if line_user_id and (history_messages or 0) > 0:
                try:
                    from app.services.conversation_service import ConversationService
                    conv = await ConversationService.get_or_create_conversation(bot_id, line_user_id)
                    if conv and conv.messages:
                        msgs = conv.messages[-int(history_messages):]
                        hist = []
                        for m in msgs:
                            role = 'assistant' if getattr(m, 'sender_type', '') == 'bot' else 'user'
                            content = ''
                            mc = getattr(m, 'content', None)
                            if isinstance(mc, dict):
                                content = str(mc.get('text') or mc.get('altText') or '')
                            elif isinstance(mc, str):
                                content = mc
                            if content:
                                hist.append({'role': role, 'content': content})
                except Exception as _e:
                    logger.warning(f"構建歷史對話失敗: {_e}")
            return await RAGService.generate_answer(
                query,
                contexts,
                provider=provider,
                model=model,
                history=hist,
                system_prompt=system_prompt,
            )
        except Exception as e:
            logger.error(f"RAG 回答失敗: {e}")
            return None

    @staticmethod
    async def answer_with_context_management(
        db: AsyncSession,
        bot_id: str,
        query: str,
        conversation_id: str,
        *,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        threshold: Optional[float] = None,
        top_k: Optional[int] = None,
        system_prompt: Optional[str] = None,
        use_rerank: bool = True,
        use_hybrid: bool = False,
        use_conversation_history: bool = True,
        rerank_model: Optional[str] = None,
        embedding_model: Optional[str] = None,
        vector_weight: float = 0.7,
        bm25_weight: float = 0.3,
    ) -> Optional[str]:
        """
        使用上下文管理的 RAG 回答方法

        Args:
            db: 資料庫會話
            bot_id: Bot ID
            query: 用戶查詢
            conversation_id: 對話 ID
            provider: AI 提供商
            model: AI 模型
            threshold: 相似度門檻
            top_k: 返回結果數量
            system_prompt: 系統提示詞
            use_rerank: 是否使用重排序
            use_hybrid: 是否使用混合搜尋
            use_conversation_history: 是否使用對話歷史
            rerank_model: 重排序模型
            embedding_model: 嵌入模型
            vector_weight: 向量搜尋權重
            bm25_weight: BM25 搜尋權重

        Returns:
            AI 回應
        """
        try:
            # 選擇檢索方法
            if use_hybrid:
                items = await RAGService.hybrid_search(
                    db, bot_id, query,
                    vector_weight=vector_weight,
                    bm25_weight=bm25_weight,
                    top_k=top_k or RAGService.TOP_K,
                    vector_threshold=threshold or RAGService.MIN_SIMILARITY,
                    model_name=embedding_model
                )
            elif use_rerank:
                items = await RAGService.retrieve_with_rerank(
                    db, bot_id, query,
                    threshold=threshold,
                    final_k=top_k or RAGService.TOP_K,
                    rerank_model=rerank_model,
                    model_name=embedding_model
                )
            else:
                items = await RAGService.retrieve(
                    db, bot_id, query,
                    threshold=threshold,
                    top_k=top_k,
                    model_name=embedding_model
                )

            # 構建知識庫上下文
            contexts = [kc.content for kc, _ in items] if items else []
            context_text = "\n\n".join([f"[片段{i+1}]\n{c}" for i, c in enumerate(contexts)])

            # 使用 Groq 服務的上下文管理方法
            if provider == "groq" or not provider:
                from app.services.groq_service import GroqService
                return await GroqService.ask_groq_with_context_management(
                    question=query,
                    context_text=context_text,
                    conversation_id=conversation_id,
                    model=model,
                    system_prompt=system_prompt,
                    use_conversation_history=use_conversation_history
                )
            else:
                # 回退到原有方法
                return await RAGService.generate_answer(
                    query,
                    contexts,
                    provider=provider,
                    model=model,
                    system_prompt=system_prompt
                )

        except Exception as e:
            logger.error(f"上下文管理 RAG 回答失敗: {e}")
            return None

    @staticmethod
    def get_conversation_stats(conversation_id: str) -> Dict[str, Any]:
        """獲取對話統計資訊"""
        try:
            conversation = global_context_manager.get_conversation(conversation_id)
            return conversation.get_memory_stats()
        except Exception as e:
            logger.error(f"獲取對話統計失敗: {e}")
            return {}

    @staticmethod
    def clear_conversation_memory(conversation_id: str) -> bool:
        """清除對話記憶"""
        try:
            conversation = global_context_manager.get_conversation(conversation_id)
            conversation.clear_memory()
            return True
        except Exception as e:
            logger.error(f"清除對話記憶失敗: {e}")
            return False
