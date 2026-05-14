"""
AI takeover service for LINE conversations.

Route order:
1. Logic blocks are handled by the webhook/logic engine before this service.
2. AI decides whether the user message needs uploaded-file lookup.
3. If needed, AI receives file titles/summaries, selects files, then reads source text.
4. If not needed, AI replies autonomously.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import load_only

from app.config import settings
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.services.ai.ai_analysis_service import AIAnalysisService
from app.services.ai.groq_service import GroqService
from app.services.conversation.context_builder import ConversationContext, ConversationContextBuilder

logger = logging.getLogger(__name__)


@dataclass
class SelectedDocument:
    document: KnowledgeDocument
    reason: str = ""


class AITakeoverService:
    """Generate AI takeover replies without vector retrieval."""

    MAX_DOCUMENTS_FOR_SELECTION = 80
    MAX_SELECTED_DOCUMENTS = 3
    MAX_CONTEXT_CHARS = 18000
    MAX_DOCUMENT_CHARS = 9000
    CONTROL_MODEL = "openai/gpt-oss-20b"

    ROUTER_SYSTEM_PROMPT = """你是 LINE Bot AI 接管流程中的內部路由器，不是對用戶回話的客服。

<task>
判斷目前這則 LINE 用戶訊息是否需要查詢「管理者上傳給此 LINE Bot 的檔案」才能準確回答。
</task>

<route_definitions>
document_lookup：
需要依據管理者上傳檔案中的內容，才能準確、可靠地回答目前用戶訊息。

autonomous：
不需要依據管理者上傳檔案內容，也能合理回覆目前用戶訊息。
</route_definitions>

<rules>
・不要根據固定關鍵字判斷，要理解用戶真正想完成的事
・不要假設用戶知道後台有哪些檔案
・如果沒有檔案內容就可能回答不準確，選 document_lookup
・如果檔案內容不是回答必要依據，選 autonomous
・只輸出 JSON，不要輸出解釋文字
</rules>

    <output_schema>
    {"route":"document_lookup|autonomous","confidence":"high|medium|low","reason":"簡短原因"}
    </output_schema>"""

    SELECTOR_SYSTEM_PROMPT = """你是 LINE Bot AI 接管流程中的內部檔案選擇器，不是對用戶回話的客服。

<task>
根據用戶問題，以及可用檔案的檔名與摘要，選出需要讀取原文的檔案。
</task>

<rules>
・只根據檔名與摘要判斷相關性
・如果沒有任何檔案明顯相關，selected_indexes 回傳空陣列
・最多選 3 個最相關檔案
・不要為了湊數而選檔案
・只輸出 JSON，不要輸出解釋文字
</rules>

    <output_schema>
    {"selected_indexes":[1,2],"confidence":"high|medium|low","reason":"簡短原因"}
    </output_schema>"""

    ROUTER_SCHEMA: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "route": {"type": "string", "enum": ["document_lookup", "autonomous"]},
            "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
            "reason": {"type": "string"},
        },
        "required": ["route", "confidence", "reason"],
        "additionalProperties": False,
    }

    SELECTOR_SCHEMA: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "selected_indexes": {
                "type": "array",
                "items": {"type": "integer"},
            },
            "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
            "reason": {"type": "string"},
        },
        "required": ["selected_indexes", "confidence", "reason"],
        "additionalProperties": False,
    }

    DOCUMENT_ANSWER_SYSTEM_PROMPT = """你是 LINE 聊天機器人的 AI 助手，正在根據管理者上傳的檔案回答用戶。

<primary_task>
只能根據 <knowledge_base> 中提供的檔案原文回答 <current_query>。
</primary_task>

<response_requirements>
・使用與用戶目前訊息相同的語言；如果目前訊息語言不明確，沿用最近對話的主要語言
・直接回答重點，適合 LINE 閱讀
・不要使用 Markdown 粗體、標題符號、代碼區塊或連結語法
・需要分段時，用純文字短標籤或簡短條列
・如果檔案原文不足以回答，請簡短說明目前資料沒有提供該資訊
</response_requirements>"""

    AUTONOMOUS_SYSTEM_PROMPT = """你是 LINE 聊天機器人的 AI 助手。

<primary_task>
用自然、簡潔、友善的方式回覆用戶目前的訊息。
</primary_task>

<response_requirements>
・使用與用戶目前訊息相同的語言；如果目前訊息語言不明確，沿用最近對話的主要語言
・回覆要適合 LINE 聊天，不要冗長
・不要宣稱自己查過檔案或知識庫
・不知道或需要更多資訊時，直接簡短說明
・不要使用 Markdown 粗體、標題符號、代碼區塊或連結語法
</response_requirements>"""

    DOCUMENT_UNAVAILABLE_SYSTEM_PROMPT = """你是 LINE 聊天機器人的 AI 助手。

<primary_task>
用戶的問題看起來需要參考管理者提供的資料，但目前可用資料不足以支持準確回答。
</primary_task>

<response_requirements>
・使用與用戶目前訊息相同的語言；如果目前訊息語言不明確，沿用最近對話的主要語言
・簡短說明目前資料不足，請用戶補充問題或等待管理者提供更多資訊
・不要提到內部路由、知識庫、檔案選擇流程或系統判斷
・不要使用 Markdown 粗體、標題符號、代碼區塊或連結語法
</response_requirements>"""

    @staticmethod
    async def answer(
        db: AsyncSession,
        bot_id: str,
        query: str,
        *,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        line_user_id: Optional[str] = None,
        history_messages: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Answer by AI route decision: file lookup only when needed."""
        conversation_context = await ConversationContextBuilder.build(
            db,
            bot_id=bot_id,
            line_user_id=line_user_id,
            current_query=query,
            history_messages=history_messages,
            model=model,
        )
        history = conversation_context.prompt_history
        standalone_query = conversation_context.standalone_query or query

        route = await AITakeoverService._decide_route(
            query,
            history=history,
            standalone_query=standalone_query,
        )
        logger.info(
            "AI 接管：路由=%s confidence=%s reason=%s standalone_query=%s context=%s",
            route.get("route"),
            route.get("confidence"),
            route.get("reason"),
            standalone_query,
            conversation_context.metadata,
        )

        if route.get("route") != "document_lookup":
            return await AITakeoverService._answer_autonomously(
                query,
                provider=provider,
                model=model,
                history=history,
                system_prompt=system_prompt,
            )

        documents = await AITakeoverService._get_document_summaries(db, bot_id)
        logger.info("AI 接管：開始檔案選擇，可用檔案 %s 個", len(documents))
        if not documents:
            return await AITakeoverService._answer_document_unavailable(
                query,
                provider=provider,
                model=model,
                history=history,
                system_prompt=system_prompt,
            )

        selected_documents = await AITakeoverService._select_documents_with_ai(
            standalone_query,
            documents,
            conversation_context=conversation_context,
            original_query=query,
        )
        if not selected_documents:
            logger.info("AI 接管：AI 未選出相關檔案")
            return await AITakeoverService._answer_document_unavailable(
                query,
                provider=provider,
                model=model,
                history=history,
                system_prompt=system_prompt,
            )

        logger.info(
            "AI 接管：選出 %s 個檔案: %s",
            len(selected_documents),
            ", ".join(AITakeoverService._document_title(item.document) for item in selected_documents),
        )
        return await AITakeoverService._answer_from_documents(
            db,
            query,
            selected_documents,
            provider=provider,
            model=model,
            history=history,
            system_prompt=system_prompt,
        )

    @staticmethod
    async def _get_document_summaries(db: AsyncSession, bot_id: str) -> List[KnowledgeDocument]:
        stmt = (
            select(KnowledgeDocument)
            .options(
                load_only(
                    KnowledgeDocument.id,
                    KnowledgeDocument.bot_id,
                    KnowledgeDocument.source_type,
                    KnowledgeDocument.title,
                    KnowledgeDocument.original_file_name,
                    KnowledgeDocument.ai_summary,
                    KnowledgeDocument.created_at,
                    KnowledgeDocument.deleted_at,
                )
            )
            .where(
                KnowledgeDocument.bot_id == bot_id,
                KnowledgeDocument.deleted_at.is_(None),
            )
            .order_by(KnowledgeDocument.created_at.desc())
            .limit(AITakeoverService.MAX_DOCUMENTS_FOR_SELECTION)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def _build_history(
        bot_id: str,
        line_user_id: Optional[str],
        history_messages: Optional[int],
    ) -> Optional[List[dict]]:
        if not line_user_id or (history_messages or 0) <= 0:
            return None

        try:
            from app.services.conversation.conversation_service import ConversationService

            conv = await ConversationService.get_or_create_conversation(bot_id, line_user_id)
            if not conv or not conv.messages:
                return None

            history: List[dict] = []
            for message in conv.messages[-int(history_messages):]:
                role = "assistant" if getattr(message, "sender_type", "") == "bot" else "user"
                content = ""
                message_content = getattr(message, "content", None)
                if isinstance(message_content, dict):
                    content = str(message_content.get("text") or message_content.get("altText") or "")
                elif isinstance(message_content, str):
                    content = message_content

                if content:
                    history.append({"role": role, "content": content})

            return history or None
        except Exception as exc:
            logger.warning("AI 接管：構建歷史對話失敗: %s", exc)
            return None

    @staticmethod
    async def _decide_route(
        query: str,
        *,
        history: Optional[List[dict]],
        standalone_query: Optional[str] = None,
    ) -> Dict[str, Any]:
        control_input = AITakeoverService._build_route_input(query, history, standalone_query)
        try:
            data = await AITakeoverService._ask_control_model(
                control_input,
                system_prompt=AITakeoverService.ROUTER_SYSTEM_PROMPT,
                schema_name="ai_takeover_route",
                schema=AITakeoverService.ROUTER_SCHEMA,
                max_tokens=256,
            )
        except Exception as exc:
            logger.warning("AI 接管：結構化路由失敗，改用自主回覆: %s", exc)
            return {
                "route": "autonomous",
                "confidence": "low",
                "reason": "structured_route_failed",
            }

        route = str(data.get("route") or "").strip()
        if route not in {"document_lookup", "autonomous"}:
            logger.warning("AI 接管：路由結構化輸出無效，改用自主回覆: %s", data)
            route = "autonomous"

        return {
            "route": route,
            "confidence": str(data.get("confidence") or "low"),
            "reason": str(data.get("reason") or ""),
        }

    @staticmethod
    def _build_route_input(
        query: str,
        history: Optional[List[dict]],
        standalone_query: Optional[str] = None,
    ) -> str:
        recent_history = ""
        if history:
            lines = []
            for item in history[-8:]:
                role_value = item.get("role")
                if role_value == "assistant":
                    role = "AI"
                elif role_value == "system":
                    role = "對話摘要"
                elif role_value == "admin":
                    role = "管理者"
                else:
                    role = "用戶"
                content = str(item.get("content") or "").strip()
                if content:
                    lines.append(f"{role}: {content}")
            recent_history = "\n".join(lines)

        rewritten = (standalone_query or "").strip()
        rewritten_part = ""
        if rewritten and rewritten != query.strip():
            rewritten_part = f"\n\n補全後檢索查詢：\n{rewritten}"

        if recent_history:
            return f"最近對話與摘要：\n{recent_history}\n\n目前用戶訊息：\n{query.strip()}{rewritten_part}"
        return f"目前用戶訊息：\n{query.strip()}{rewritten_part}"

    @staticmethod
    async def _select_documents_with_ai(
        query: str,
        documents: List[KnowledgeDocument],
        *,
        conversation_context: Optional[ConversationContext] = None,
        original_query: Optional[str] = None,
    ) -> List[SelectedDocument]:
        context = AITakeoverService._build_document_summary_context(documents)
        conversation_context_text = AITakeoverService._format_context_for_control(conversation_context)
        question_block = f"補全後檢索查詢：\n{query.strip()}"
        if original_query and original_query.strip() and original_query.strip() != query.strip():
            question_block = f"目前用戶原始訊息：\n{original_query.strip()}\n\n{question_block}"
        if conversation_context_text:
            question_block = f"最近對話與摘要：\n{conversation_context_text}\n\n{question_block}"
        try:
            data = await AITakeoverService._ask_control_model(
                f"{question_block}\n\n可用檔案列表與摘要：\n{context}",
                system_prompt=AITakeoverService.SELECTOR_SYSTEM_PROMPT,
                schema_name="ai_takeover_document_selection",
                schema=AITakeoverService.SELECTOR_SCHEMA,
                max_tokens=512,
            )
        except Exception as exc:
            logger.warning("AI 接管：結構化檔案選擇失敗，未選檔案: %s", exc)
            return []

        indexes = data.get("selected_indexes")
        if not isinstance(indexes, list):
            logger.warning("AI 接管：檔案選擇結構化輸出無效，未選檔案: %s", data)
            return []

        reason = str(data.get("reason") or "")
        selected: List[SelectedDocument] = []
        seen = set()
        for value in indexes:
            try:
                index = int(value)
            except (TypeError, ValueError):
                continue
            if index in seen:
                continue
            if 1 <= index <= len(documents):
                selected.append(SelectedDocument(document=documents[index - 1], reason=reason))
                seen.add(index)
            if len(selected) >= AITakeoverService.MAX_SELECTED_DOCUMENTS:
                break

        return selected

    @staticmethod
    def _build_document_summary_context(documents: List[KnowledgeDocument]) -> str:
        lines: List[str] = []
        for index, document in enumerate(documents, 1):
            title = AITakeoverService._document_title(document)
            summary = (document.ai_summary or "").strip() or "（無摘要）"
            lines.append(f"{index}. 檔名：{title}\n摘要：{summary}")
        return "\n\n".join(lines)

    @staticmethod
    def _format_context_for_control(context: Optional[ConversationContext]) -> str:
        if not context:
            return ""

        lines: List[str] = []
        if context.rolling_summary:
            lines.append(f"長期對話摘要：\n{context.rolling_summary.strip()}")
        if context.retrieved_memory:
            lines.append(f"語意相關舊對話：\n{context.retrieved_memory.strip()}")

        recent_lines = []
        for item in context.recent_history[-8:]:
            role_value = item.get("role")
            if role_value == "assistant":
                role = "AI"
            elif role_value == "admin":
                role = "管理者"
            else:
                role = "用戶"
            content = str(item.get("content") or "").strip()
            if content:
                recent_lines.append(f"{role}: {content}")
        if recent_lines:
            lines.append("最近完整對話：\n" + "\n".join(recent_lines))

        return "\n\n".join(lines)

    @staticmethod
    def _document_title(document: KnowledgeDocument) -> str:
        return document.title or document.original_file_name or "未命名檔案"

    @staticmethod
    async def _build_document_context(
        db: AsyncSession,
        selected_documents: List[SelectedDocument],
    ) -> str:
        parts: List[str] = []
        total_chars = 0

        for index, selected in enumerate(selected_documents, 1):
            document = selected.document
            title = AITakeoverService._document_title(document)
            summary = (document.ai_summary or "").strip()
            content = await AITakeoverService._read_document_text(db, document)
            content = content[: AITakeoverService.MAX_DOCUMENT_CHARS]

            block = [
                f"【檔案 {index}】",
                f"檔名：{title}",
            ]
            if summary:
                block.append(f"摘要：{summary}")
            if content:
                block.append(f"原文：\n{content}")

            text = "\n".join(block)
            if total_chars + len(text) > AITakeoverService.MAX_CONTEXT_CHARS:
                break

            parts.append(text)
            total_chars += len(text)

        return "\n\n".join(parts)

    @staticmethod
    async def _read_document_text(db: AsyncSession, document: KnowledgeDocument) -> str:
        result = await db.execute(
            select(KnowledgeDocument.original_content).where(KnowledgeDocument.id == document.id)
        )
        original_content = (result.scalar_one_or_none() or "").strip()
        if original_content:
            return original_content

        chunk_result = await db.execute(
            select(KnowledgeChunk.content)
            .where(
                KnowledgeChunk.document_id == document.id,
                KnowledgeChunk.deleted_at.is_(None),
            )
            .order_by(KnowledgeChunk.created_at.asc())
            .limit(40)
        )
        return "\n\n".join(content for content in chunk_result.scalars().all() if content)

    @staticmethod
    async def _answer_from_documents(
        db: AsyncSession,
        query: str,
        selected_documents: List[SelectedDocument],
        *,
        provider: Optional[str],
        model: Optional[str],
        history: Optional[List[dict]],
        system_prompt: Optional[str],
    ) -> str:
        context_text = await AITakeoverService._build_document_context(db, selected_documents)
        if not context_text.strip():
            return await AITakeoverService._answer_document_unavailable(
                query,
                provider=provider,
                model=model,
                history=history,
                system_prompt=system_prompt,
            )

        prompt = AITakeoverService._merge_prompt(
            AITakeoverService.DOCUMENT_ANSWER_SYSTEM_PROMPT,
            system_prompt,
        )

        result = await AIAnalysisService.ask_ai(
            query,
            context_text=context_text,
            history=history,
            model=model,
            provider=provider,
            system_prompt=prompt,
            max_tokens=None,
            context_kind="knowledge_base",
        )
        answer = (result or {}).get("answer", "")
        return (answer or "").strip() or AITakeoverService._fallback_document_unavailable_message(query)

    @staticmethod
    async def _answer_document_unavailable(
        query: str,
        *,
        provider: Optional[str],
        model: Optional[str],
        history: Optional[List[dict]],
        system_prompt: Optional[str],
    ) -> str:
        prompt = AITakeoverService._merge_prompt(
            AITakeoverService.DOCUMENT_UNAVAILABLE_SYSTEM_PROMPT,
            system_prompt,
        )

        try:
            result = await AIAnalysisService.ask_ai(
                query,
                context_text="",
                history=history,
                model=model,
                provider=provider,
                system_prompt=prompt,
                max_tokens=300,
                context_kind="autonomous",
            )
            answer = (result or {}).get("answer", "")
            if answer and answer.strip():
                return answer.strip()
        except Exception as exc:
            logger.warning("AI 接管：資料不足說明生成失敗: %s", exc)

        return AITakeoverService._fallback_document_unavailable_message(query)

    @staticmethod
    async def _answer_autonomously(
        query: str,
        *,
        provider: Optional[str],
        model: Optional[str],
        history: Optional[List[dict]],
        system_prompt: Optional[str],
    ) -> str:
        prompt = AITakeoverService._merge_prompt(
            AITakeoverService.AUTONOMOUS_SYSTEM_PROMPT,
            system_prompt,
        )

        result = await AIAnalysisService.ask_ai(
            query,
            context_text="",
            history=history,
            model=model,
            provider=provider,
            system_prompt=prompt,
            max_tokens=None,
            context_kind="autonomous",
        )
        answer = (result or {}).get("answer", "")
        return (answer or "").strip() or AITakeoverService._fallback_autonomous_message(query)

    @staticmethod
    async def _ask_control_model(
        prompt: str,
        *,
        system_prompt: str,
        schema_name: str,
        schema: Dict[str, Any],
        max_tokens: int,
    ) -> Dict[str, Any]:
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is required for AI takeover structured control calls")

        client = GroqService._get_client(settings.GROQ_API_KEY)
        completion = await client.chat.completions.create(
            model=AITakeoverService.CONTROL_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            temperature=0.0,
            max_tokens=max_tokens,
            top_p=1.0,
            stream=False,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": schema_name,
                    "strict": True,
                    "schema": schema,
                },
            },
        )
        content = ""
        if completion.choices and completion.choices[0].message:
            content = completion.choices[0].message.content or ""

        data = json.loads(content)
        return data if isinstance(data, dict) else {}

    @staticmethod
    def _fallback_document_unavailable_message(query: str) -> str:
        language = AITakeoverService._detect_simple_language(query)
        if language == "ja":
            return "現在の情報だけでは正確に回答できません。もう少し詳しく教えてください。"
        if language == "ko":
            return "현재 제공된 정보만으로는 정확히 답변하기 어렵습니다. 조금 더 자세히 알려 주세요."
        if language == "zh":
            return "目前資料不足以準確回答，請再補充一點問題內容。"
        return "I do not have enough information to answer accurately. Please share a little more detail."

    @staticmethod
    def _fallback_autonomous_message(query: str) -> str:
        language = AITakeoverService._detect_simple_language(query)
        if language == "ja":
            return "もう少し詳しく教えてください。"
        if language == "ko":
            return "조금 더 자세히 알려 주세요."
        if language == "zh":
            return "請再補充一點問題內容。"
        return "Please share a little more detail."

    @staticmethod
    def _detect_simple_language(query: str) -> str:
        for char in query:
            code = ord(char)
            if 0x3040 <= code <= 0x30FF:
                return "ja"
            if 0xAC00 <= code <= 0xD7AF:
                return "ko"
            if 0x4E00 <= code <= 0x9FFF:
                return "zh"
        return "en"

    @staticmethod
    def _merge_prompt(base_prompt: str, custom_prompt: Optional[str]) -> str:
        if not custom_prompt or not custom_prompt.strip():
            return base_prompt
        return (
            f"{base_prompt}\n\n"
            "<bot_custom_instructions>\n"
            f"{custom_prompt.strip()}\n"
            "</bot_custom_instructions>"
        )
