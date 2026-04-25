"""
RAG (Retrieval-Augmented Generation) service.
Implements retrieval over Postgres+pgvector and generation via existing AIAnalysisService.
優化版本：添加查詢結果快取以提升效能
深度優化版本：添加效能分析和優化首次查詢速度
"""
from __future__ import annotations

import logging
import time
import asyncio
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text as sql_text

from app.models.knowledge import KnowledgeChunk
from app.services.embedding.embedding_service import embed_text
from app.services.ai.ai_analysis_service import AIAnalysisService
from app.services.rag.rerank_service import RerankService, HybridRanker
from app.services.rag.hybrid_search_service import HybridSearchService
from app.services.conversation.context_manager import global_context_manager, MessageRole
from app.services.rag.rag_cache import get_rag_cache
from app.services.rag.performance_profiler import PerformanceProfiler, profile_async
from app.services.ai.prompt_templates import PromptTemplates

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
        model_name: Optional[str] = None,
        use_cache: bool = True,
        profiler: Optional[PerformanceProfiler] = None
    ) -> List[Tuple[KnowledgeChunk, float]]:
        """
        Retrieve top chunks across project and global scopes using cosine similarity.
        支援新的嵌入模型和向後相容性。
        優化版本：支援查詢結果快取和效能分析
        """
        # 創建效能分析器（如果未提供）
        if profiler is None:
            profiler = PerformanceProfiler("retrieve")

        # 嘗試從快取獲取結果
        if use_cache:
            async with profiler.measure("cache_lookup"):
                cache = get_rag_cache()
                cached_results = cache.get(
                    bot_id=bot_id,
                    query=query,
                    search_type='vector',
                    threshold=threshold,
                    top_k=top_k,
                    model_name=model_name
                )

                if cached_results is not None:
                    logger.info(f"✅ 快取命中: {query[:50]}...")
                    # 將字典轉換回 KnowledgeChunk 對象
                    items = []
                    for chunk_dict, score in cached_results:
                        kc = KnowledgeChunk()
                        kc.id = chunk_dict['id']
                        kc.document_id = chunk_dict['document_id']
                        kc.bot_id = chunk_dict['bot_id']
                        kc.content = chunk_dict['content']
                        items.append((kc, score))
                    return items

        logger.info(f"🔍 快取未命中，執行完整檢索: {query[:50]}...")
        logger.info(f"📊 [RAG] 查詢參數 - bot_id: {bot_id}, model: {model_name}, use_cache: {use_cache}")

        # 快取未命中，執行實際查詢
        # 使用指定的模型生成查詢嵌入（embed_text 內部已有快取）
        logger.info(f"🚀 [RAG] 開始生成 embedding...")
        import time
        embedding_start = time.time()
        async with profiler.measure("embedding_generation", query_length=len(query)):
            emb = await embed_text(query, model_name, use_cache=use_cache)

        embedding_time = (time.time() - embedding_start) * 1000
        logger.info(f"⏱️ [RAG] Embedding 生成完成，耗時: {embedding_time:.2f}ms")

        # 轉換為 pgvector 格式字串
        embedding_str = "[" + ",".join(map(str, emb)) + "]"

        # pgvector cosine distance: embedding <=> query_embedding
        # distance = 1 - cosine_similarity
        # Filter by similarity >= MIN_SIMILARITY => distance <= (1 - MIN_SIMILARITY)
        th = RAGService.MIN_SIMILARITY if threshold is None else max(0.0, min(1.0, float(threshold)))
        k = RAGService.TOP_K if top_k is None else max(1, int(top_k))
        max_distance = 1.0 - th

        # 單一 768 維向量欄位 embedding（pgvector）
        # 只檢索未刪除的切塊和文件
        # 優化：使用 HNSW 索引加速查詢

        async with profiler.measure("database_query", top_k=k, threshold=th):
            # 先設置 ef_search 參數（需要分開執行）
            try:
                await db.execute(sql_text("SET LOCAL hnsw.ef_search = 100"))
            except Exception as e:
                logger.debug(f"設置 hnsw.ef_search 失敗（可能不支援）: {e}")

            sql = sql_text(
                """
                SELECT kc.*,
                       (1 - (kc.embedding <=> CAST(:q AS vector))) AS score
                FROM knowledge_chunks kc
                JOIN knowledge_documents kd ON kc.document_id = kd.id
                WHERE (kc.bot_id = CAST(:bot_id AS UUID) OR kc.bot_id IS NULL)
                  AND kc.deleted_at IS NULL
                  AND kd.deleted_at IS NULL
                  AND (kc.embedding <=> CAST(:q AS vector)) <= :maxd
                ORDER BY (kc.embedding <=> CAST(:q AS vector))
                LIMIT :k
                """
            )

            rows = (await db.execute(sql, {"q": embedding_str, "bot_id": bot_id, "maxd": max_distance, "k": k})).mappings().all()

        async with profiler.measure("result_processing", result_count=len(rows)):
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

        # 存入快取
        if use_cache and items:
            async with profiler.measure("cache_store"):
                cache = get_rag_cache()
                cache.set(
                    bot_id=bot_id,
                    query=query,
                    search_type='vector',
                    results=items,
                    threshold=threshold,
                    top_k=top_k,
                    model_name=model_name
                )

        # 打印效能摘要
        summary = profiler.get_summary()
        logger.info(f"📊 檢索效能: 總耗時 {summary['total_time_ms']:.2f}ms")
        for metric in summary['metrics']:
            logger.info(f"  - {metric['name']}: {metric['duration_ms']:.2f}ms ({metric['percentage']:.1f}%)")

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
    async def get_knowledge_documents_summary(
        db: AsyncSession,
        bot_id: str
    ) -> List[Dict[str, str]]:
        """
        取得知識庫文件列表（檔案名稱 + AI 摘要）

        Args:
            db: 資料庫 session
            bot_id: Bot ID

        Returns:
            List[Dict]: 文件列表，每個元素包含 title 和 ai_summary
        """
        try:
            from app.models.knowledge import KnowledgeDocument

            # 查詢該 bot 的所有文件（包含 project 和 global），只查詢未刪除的文件
            stmt = select(KnowledgeDocument).where(
                ((KnowledgeDocument.bot_id == bot_id) | (KnowledgeDocument.bot_id.is_(None))),
                KnowledgeDocument.deleted_at.is_(None)
            ).order_by(KnowledgeDocument.created_at.desc())

            result = await db.execute(stmt)
            documents = result.scalars().all()

            # 構建文件列表
            doc_list = []
            for doc in documents:
                # 只包含有摘要的文件
                if doc.ai_summary:
                    doc_list.append({
                        "title": doc.title or doc.original_file_name or "未命名文件",
                        "summary": doc.ai_summary
                    })

            logger.info(f"取得知識庫文件列表: {len(doc_list)} 個文件（bot_id={bot_id}）")
            return doc_list

        except Exception as e:
            logger.error(f"取得知識庫文件列表失敗: {e}")
            return []

    @staticmethod
    async def _classify_intent(query: str, db: Optional[AsyncSession] = None, bot_id: Optional[str] = None) -> str:
        """
        使用 Groq API 判斷用戶意圖。

        Args:
            query: 用戶訊息

        Returns:
            "chat" - 閒聊
            "query" - 詢問問題/查詢資訊
        """
        try:
            from app.services.ai.groq_service import GroqService
            from app.config import settings
            import re

            # 使用 llama-3.1-8b-instant 模型進行意圖判斷（快速且不會產生 reasoning）
            intent_model = "llama-3.1-8b-instant"

            # 取得知識庫文件列表（如果有提供 db 和 bot_id）
            knowledge_context = ""
            if db and bot_id:
                try:
                    doc_list = await RAGService.get_knowledge_documents_summary(db, bot_id)
                    if doc_list:
                        knowledge_context = "\n\n【知識庫文件列表】\n以下是系統中已有的知識庫文件及其摘要：\n\n"
                        for i, doc in enumerate(doc_list[:10], 1):  # 最多顯示 10 個文件
                            knowledge_context += f"{i}. {doc['title']}\n   摘要：{doc['summary']}\n\n"
                        knowledge_context += "【知識庫文件列表結束】\n"
                        logger.info(f"意圖判斷加入 {len(doc_list)} 個知識庫文件摘要")
                except Exception as e:
                    logger.warning(f"取得知識庫文件列表失敗（不影響意圖判斷）: {e}")

            # 優化的系統提示詞 - 加入知識庫文件列表參考
            intent_system_prompt = (
                "你是一個嚴格的意圖分類器。你的任務是分析用戶訊息，判斷其核心意圖。\n\n"
                "【輸出格式要求 - 非常重要】\n"
                "你必須且僅能回答以下兩個詞之一：chat 或 query\n"
                "不要加上任何標點符號、解釋、引號、括號或其他文字。\n"
                "嚴格遵守格式，只輸出一個英文單詞。\n\n"
                "【分類原則】\n"
                "chat：用戶的主要目的是進行社交互動、情感交流或日常對話，不需要具體資訊或答案。\n"
                "query：用戶的主要目的是獲取特定資訊、尋求解答或需要實質性的回應內容。\n\n"
                "【知識庫文件列表判斷規則 - 最重要】\n"
                "如果用戶訊息中包含【知識庫文件列表】區塊：\n"
                "1. 仔細閱讀列表中每個文件的「檔案名稱」和「摘要」\n"
                "2. 判斷用戶問題是否與任一文件的主題或內容相關\n"
                "3. 判斷標準：\n"
                "   - 如果用戶問題明確詢問文件中提到的主題、概念或資訊 → 輸出 query\n"
                "   - 如果用戶問題與所有文件的主題都完全無關 → 輸出 chat\n"
                "   - 如果用戶問題是閒聊、問候、情感表達等社交性質 → 輸出 chat\n"
                "4. 範例說明：\n"
                "   - 文件摘要提到「營業時間」，用戶問「你們週末有開嗎」→ query（相關）\n"
                "   - 文件摘要提到「產品價格」，用戶問「今天天氣真好」→ chat（無關）\n"
                "   - 文件摘要提到「退貨政策」，用戶問「如何退貨」→ query（相關）\n\n"
                "如果用戶訊息中沒有【知識庫文件列表】區塊：\n"
                "- 按照一般分類原則判斷（閒聊 → chat，查詢資訊 → query）\n\n"
                "請根據以上規則進行判斷，只輸出 chat 或 query。"
            )

            # 構建用戶訊息（包含知識庫文件列表）
            user_message = query
            if knowledge_context:
                user_message = f"{knowledge_context}\n【用戶問題】\n{query}"
                logger.info(
                    f"📋 意圖判斷 - 發送給 AI 的完整訊息：\n"
                    f"{'='*60}\n"
                    f"【系統提示詞】\n{intent_system_prompt}\n"
                    f"{'='*60}\n"
                    f"【用戶訊息（包含知識庫文件列表）】\n{user_message}\n"
                    f"{'='*60}"
                )
            else:
                logger.info(
                    f"📋 意圖判斷 - 發送給 AI 的訊息（無知識庫文件列表）：\n"
                    f"   用戶問題: '{query}'"
                )

            # 呼叫 Groq API（加入超時保護，避免卡住 webhook 背景流程）
            client = GroqService._get_client(settings.GROQ_API_KEY)

            completion = await asyncio.wait_for(
                client.chat.completions.create(
                    model=intent_model,
                    messages=[
                        {"role": "system", "content": intent_system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    temperature=0.0,  # 使用 0 溫度以獲得最確定的分類
                    max_tokens=10,    # 10 個 tokens 足夠輸出 chat 或 query
                    top_p=1.0,        # 使用確定性採樣
                    stream=False
                ),
                timeout=12.0
            )

            # 記錄完整的 API 回應以便除錯
            logger.info(
                f"🔍 意圖判斷 API 回應：\n"
                f"   模型: {intent_model}\n"
                f"   用戶問題: '{query}'\n"
                f"   AI 回應: {completion.choices[0].message.content if completion.choices else 'None'}"
            )

            # 解析回應
            if completion.choices and len(completion.choices) > 0:
                raw_response = completion.choices[0].message.content

                # 清理回應：移除所有空白字元、標點符號、引號等
                cleaned_intent = re.sub(r'[^\w]', '', raw_response.strip().lower())

                logger.info(
                    f"📝 意圖判斷解析過程：\n"
                    f"   原始回應: '{raw_response}'\n"
                    f"   清理後: '{cleaned_intent}'\n"
                    f"   回應長度: {len(raw_response)} 字元"
                )

                # 嚴格匹配：完全等於 'chat' 或 'query'
                if cleaned_intent == "chat":
                    logger.info(f"✅ 意圖判斷結果: 閒聊 (原始回應: '{raw_response}')")
                    return "chat"
                elif cleaned_intent == "query":
                    logger.info(f"✅ 意圖判斷結果: 查詢 (原始回應: '{raw_response}')")
                    return "query"
                else:
                    # 容錯處理：檢查是否包含關鍵詞
                    if "chat" in cleaned_intent:
                        logger.warning(
                            f"⚠️ 意圖判斷包含 'chat' 但格式不標準\n"
                            f"   原始回應: '{raw_response}'\n"
                            f"   清理後: '{cleaned_intent}'\n"
                            f"   判定為: 閒聊"
                        )
                        return "chat"
                    elif "query" in cleaned_intent:
                        logger.warning(
                            f"⚠️ 意圖判斷包含 'query' 但格式不標準\n"
                            f"   原始回應: '{raw_response}'\n"
                            f"   清理後: '{cleaned_intent}'\n"
                            f"   判定為: 查詢"
                        )
                        return "query"
                    else:
                        # 完全無法識別，記錄詳細資訊並預設為查詢
                        logger.warning(
                            f"❌ 意圖判斷結果不明確，無法識別！\n"
                            f"   用戶訊息: '{query}'\n"
                            f"   原始回應: '{raw_response}'\n"
                            f"   清理後: '{cleaned_intent}'\n"
                            f"   回應長度: {len(raw_response)} 字元\n"
                            f"   回應類型: {type(raw_response)}\n"
                            f"   完整 completion 物件: {completion}\n"
                            f"   預設為: 查詢模式"
                        )
                        return "query"

            # 預設為查詢
            logger.warning(
                f"⚠️ 意圖判斷無回應\n"
                f"   用戶訊息: '{query}'\n"
                f"   完整 completion 物件: {completion}\n"
                f"   預設為: 查詢"
            )
            return "query"

        except Exception as e:
            logger.error(
                f"❌ 意圖判斷失敗\n"
                f"   錯誤訊息: {e}\n"
                f"   用戶訊息: '{query}'\n"
                f"   預設為: 查詢",
                exc_info=True
            )
            # 發生錯誤時預設為查詢，確保不會遺漏重要問題
            return "query"

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
        """
        使用 AI 生成答案（基於知識庫檢索結果）

        使用優化的提示詞模板，明確區分資訊來源：
        - contexts: 知識庫檢索到的相關片段
        - history: 對話歷史（用於上下文理解）
        - query: 當前用戶問題
        """
        # 格式化知識庫內容
        context_text = "\n\n".join([f"[片段{i+1}]\n{c}" for i, c in enumerate(contexts)])

        # 使用新的提示詞模板（如果沒有自訂系統提示詞）
        if not system_prompt:
            system_prompt = PromptTemplates.RAG_SYSTEM_PROMPT

        result = await AIAnalysisService.ask_ai(
            query,
            context_text=context_text,
            history=history,
            model=model,
            provider=provider,
            system_prompt=system_prompt,
            max_tokens=None,
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
            # ========== 步驟 1: 意圖判斷（加入知識庫文件列表優化）==========
            logger.info(f"🔍 開始意圖判斷: {query}")
            intent = await RAGService._classify_intent(query, db=db, bot_id=bot_id)
            logger.info(f"✅ 意圖判斷完成: {intent}")

            # 構建對話歷史（兩種情況都需要）
            hist: Optional[List[dict]] = None
            if line_user_id and (history_messages or 0) > 0:
                try:
                    from app.services.conversation.conversation_service import ConversationService
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

            # ========== 步驟 2: 根據意圖分流處理 ==========
            if intent == "chat":
                # 閒聊模式：跳過 RAG 檢索，直接使用 AI 生成回覆
                logger.info("💬 閒聊模式：跳過知識庫檢索，直接生成回覆")

                # 使用空的 contexts 列表，讓 AI 自由對話
                return await RAGService.generate_answer(
                    query,
                    contexts=[],  # 不提供知識庫內容
                    provider=provider,
                    model=model,
                    history=hist,
                    system_prompt=system_prompt or (
                        "你是 LINE 聊天機器人，正在與用戶閒聊。\n\n"
                        "回覆風格：\n"
                        "・簡短自然，像朋友聊天一樣（1-2 句話即可）\n"
                        "・語氣輕鬆親切，但不要過度熱情或冗長\n"
                        "・可以用表情符號，但不要每句都用\n"
                        "・避免說「有什麼需要幫忙」、「隨時告訴我」等客服用語\n"
                        "・就像普通朋友回訊息，簡單、真誠就好\n\n"
                        "【格式規範 - 重要！】\n"
                        "你的回覆會顯示在 LINE 卡片中，請嚴格遵守以下規則：\n\n"
                        "✗ 絕對禁止使用這些符號：\n"
                        "  **文字**（粗體）、*文字*（斜體）、`代碼`、# 標題、- 列表、* 列表、> 引用\n\n"
                        "✓ 請改用這些方式：\n"
                        "  【標題】用中文括號\n"
                        "  ・項目 用日文中點\n"
                        "  1. 項目 用數字編號\n"
                        "  直接換行分段即可\n\n"
                        "範例（正確）：\n"
                        "早安！😊\n"
                        "祝你今天順利～"
                    ),
                )

            else:  # intent == "query"
                # 查詢模式：執行完整的 RAG 檢索流程
                logger.info("📚 查詢模式：執行知識庫檢索")

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

                # 若沒有檢索到任何片段，回退到混合搜尋以提升召回率
                if not items:
                    try:
                        logger.info("⚠️ 向量檢索為空，回退到混合搜尋（降低門檻並加入 BM25）")
                        items = await RAGService.hybrid_search(
                            db, bot_id, query,
                            vector_weight=vector_weight,
                            bm25_weight=bm25_weight,
                            top_k=top_k or RAGService.TOP_K,
                            vector_threshold=(threshold or RAGService.MIN_SIMILARITY) * 0.8,
                            model_name=embedding_model
                        )
                    except Exception as fb_e:
                        logger.warning(f"混合搜尋回退失敗: {fb_e}")

                contexts = [kc.content for kc, _ in items] if items else []
                logger.info(f"📖 檢索到 {len(contexts)} 個知識片段")

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

            # 若未命中任何向量結果，回退到混合搜尋以提升召回率
            if not items:
                try:
                    logger.info("⚠️ 向量檢索為空，回退到混合搜尋（降低門檻並加入 BM25）")
                    items = await RAGService.hybrid_search(
                        db, bot_id, query,
                        vector_weight=vector_weight,
                        bm25_weight=bm25_weight,
                        top_k=top_k or RAGService.TOP_K,
                        vector_threshold=(threshold or RAGService.MIN_SIMILARITY) * 0.8,
                        model_name=embedding_model
                    )
                except Exception as fb_e:
                    logger.warning(f"混合搜尋回退失敗: {fb_e}")

            # 構建知識庫上下文
            contexts = [kc.content for kc, _ in items] if items else []
            context_text = "\n\n".join([f"[片段{i+1}]\n{c}" for i, c in enumerate(contexts)])

            # 使用 Groq 服務的上下文管理方法
            if provider == "groq" or not provider:
                from app.services.ai.groq_service import GroqService
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
