"""
Conversation context builder for LINE AI takeover.

The builder composes context from multiple layers instead of blindly taking the
last N messages:
- recent complete turns for local coherence
- rolling summary for older conversation state
- semantic retrieval over older transcript messages
- standalone query rewriting for follow-up questions
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence, Set
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.conversation_memory import ConversationMemoryEmbedding
from app.models.mongodb.conversation import ConversationDocument, MessageDocument
from app.services.ai.groq_service import GroqService
from app.services.conversation.context_manager import TokenCounter
from app.services.embedding.embedding_service import embed_text, embed_texts

logger = logging.getLogger(__name__)


@dataclass
class NormalizedMessage:
    id: str
    role: str
    content: str
    sender_type: str
    message_type: str
    timestamp: Optional[datetime] = None


@dataclass
class ConversationContext:
    prompt_history: List[Dict[str, str]] = field(default_factory=list)
    recent_history: List[Dict[str, str]] = field(default_factory=list)
    rolling_summary: Optional[str] = None
    retrieved_memory: str = ""
    standalone_query: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


class ConversationContextBuilder:
    """Build model-ready context for a LINE user conversation."""

    CONTROL_MODEL = "openai/gpt-oss-20b"
    SUMMARY_MAX_CHARS = 5000
    MEMORY_CONTENT_MAX_CHARS = 900

    STANDALONE_QUERY_SYSTEM_PROMPT = """你是 LINE Bot 的查詢改寫器。

<task>
根據最近對話與摘要，把用戶目前訊息改寫成可以獨立理解、適合做知識庫與歷史對話檢索的查詢。
</task>

<rules>
・不要回答問題，只改寫查詢
・如果目前訊息已經完整，原樣返回
・保留原語言
・補足代名詞、省略主詞、前文提到的產品/方案/日期/人物
・不要編造前文沒有的事實
・只輸出改寫後的一句話，不要加解釋
</rules>"""

    SUMMARY_SYSTEM_PROMPT = """你是 LINE 客服對話的記憶摘要器。

<task>
把舊對話壓縮成後續回覆有用的 rolling summary。
</task>

<summary_schema>
目前用戶目標：
已確認的重要資訊：
用戶偏好/限制：
已提過的方案或建議：
待追蹤問題：
</summary_schema>

<rules>
・保留對後續回覆有用的具體名詞、偏好、約束、決策與未解問題
・刪除寒暄、重複與無關內容
・不要加入對話中沒有出現的資訊
・使用繁體中文，除非原內容主要是其他語言
・控制在 1200 字內
</rules>"""

    @classmethod
    async def build(
        cls,
        db: AsyncSession,
        *,
        bot_id: str,
        line_user_id: Optional[str],
        current_query: str,
        history_messages: Optional[int],
        model: Optional[str] = None,
    ) -> ConversationContext:
        if not line_user_id:
            return ConversationContext(standalone_query=current_query.strip())

        try:
            conversation = await ConversationDocument.get_or_create_conversation(bot_id, line_user_id)
        except Exception as exc:
            logger.warning("AI 上下文：讀取 MongoDB 對話失敗: %s", exc)
            return ConversationContext(standalone_query=current_query.strip())

        all_messages = cls._normalize_messages(conversation.messages)
        prior_messages, current_message_id = cls._exclude_current_message(all_messages, current_query)
        effective_history_count = cls._effective_history_count(history_messages)
        if effective_history_count <= 0:
            return ConversationContext(
                standalone_query=current_query.strip(),
                metadata={
                    "history_policy": "disabled",
                    "requested_history_messages": history_messages,
                    "effective_history_messages": effective_history_count,
                    "total_text_messages": len(all_messages),
                    "prior_text_messages": len(prior_messages),
                    "current_message_id": current_message_id,
                },
            )

        await cls._maybe_update_rolling_summary(conversation, prior_messages)

        recent_messages = prior_messages[-effective_history_count:] if effective_history_count > 0 else []
        recent_ids = {message.id for message in recent_messages}
        if current_message_id:
            recent_ids.add(current_message_id)

        await cls._ensure_recent_memory_index(db, bot_id, line_user_id, prior_messages)

        standalone_query = await cls._build_standalone_query(
            current_query=current_query,
            rolling_summary=conversation.rolling_summary,
            recent_messages=prior_messages[-8:],
        )

        retrieved_memories = await cls._retrieve_relevant_memories(
            db=db,
            bot_id=bot_id,
            line_user_id=line_user_id,
            query=standalone_query,
            exclude_message_ids=recent_ids,
        )
        retrieved_memory_text = cls._format_retrieved_memories(retrieved_memories)

        prompt_history = cls._pack_prompt_history(
            rolling_summary=conversation.rolling_summary,
            retrieved_memory=retrieved_memory_text,
            recent_messages=recent_messages,
            model=model or settings.GROQ_MODEL,
        )

        return ConversationContext(
            prompt_history=prompt_history,
            recent_history=cls._messages_to_prompt_history(recent_messages),
            rolling_summary=conversation.rolling_summary,
            retrieved_memory=retrieved_memory_text,
            standalone_query=standalone_query,
            metadata={
                "history_policy": "summary+semantic_memory+recent_token_budget",
                "requested_history_messages": history_messages,
                "effective_history_messages": effective_history_count,
                "total_text_messages": len(all_messages),
                "prior_text_messages": len(prior_messages),
                "recent_messages": len(recent_messages),
                "has_rolling_summary": bool(conversation.rolling_summary),
                "retrieved_memory_count": len(retrieved_memories),
                "current_message_id": current_message_id,
            },
        )

    @staticmethod
    def _effective_history_count(history_messages: Optional[int]) -> int:
        if history_messages is None:
            value = settings.AI_DEFAULT_HISTORY_MESSAGES
        else:
            value = int(history_messages)
        return max(0, min(value, settings.AI_MAX_HISTORY_MESSAGES))

    @staticmethod
    def _message_text(message_content: Any) -> str:
        if isinstance(message_content, dict):
            for key in ("text", "altText", "displayText", "data"):
                value = message_content.get(key)
                if value:
                    return str(value).strip()
            return ""
        if isinstance(message_content, str):
            return message_content.strip()
        return ""

    @classmethod
    def _normalize_messages(cls, messages: Sequence[MessageDocument]) -> List[NormalizedMessage]:
        normalized: List[NormalizedMessage] = []
        for message in messages or []:
            content = cls._message_text(getattr(message, "content", None))
            if not content:
                continue

            sender_type = str(getattr(message, "sender_type", "") or "user")
            if sender_type == "bot":
                role = "assistant"
            elif sender_type == "admin":
                role = "admin"
            else:
                role = "user"

            normalized.append(
                NormalizedMessage(
                    id=str(getattr(message, "id", "")),
                    role=role,
                    content=content,
                    sender_type=sender_type,
                    message_type=str(getattr(message, "message_type", "") or "text"),
                    timestamp=getattr(message, "timestamp", None),
                )
            )
        normalized.sort(key=lambda item: item.timestamp or datetime.min)
        return normalized

    @staticmethod
    def _exclude_current_message(
        messages: List[NormalizedMessage],
        current_query: str,
    ) -> tuple[List[NormalizedMessage], Optional[str]]:
        if not messages:
            return [], None

        latest = messages[-1]
        if latest.role == "user" and latest.content.strip() == current_query.strip():
            return messages[:-1], latest.id
        return messages, None

    @classmethod
    async def _maybe_update_rolling_summary(
        cls,
        conversation: ConversationDocument,
        prior_messages: List[NormalizedMessage],
    ) -> None:
        retain_recent = max(1, settings.AI_SUMMARY_RECENT_MESSAGES)
        if len(prior_messages) <= retain_recent:
            return

        summarizable = prior_messages[:-retain_recent]
        already_summarized = max(0, int(conversation.summary_message_count or 0))
        if len(summarizable) <= already_summarized:
            return

        pending_count = len(summarizable) - already_summarized
        if conversation.rolling_summary and pending_count < max(1, settings.AI_SUMMARY_BATCH_MESSAGES):
            return

        pending_messages = summarizable[already_summarized:]
        previous_summary = conversation.rolling_summary or ""
        new_summary = await cls._summarize_messages(previous_summary, pending_messages)

        if not new_summary:
            return

        conversation.rolling_summary = new_summary[: cls.SUMMARY_MAX_CHARS]
        conversation.summary_message_count = len(summarizable)
        conversation.summary_updated_at = datetime.utcnow()
        conversation.updated_at = datetime.utcnow()
        try:
            await conversation.save()
            logger.info(
                "AI 上下文：rolling summary 更新完成 bot_id=%s line_user_id=%s summarized=%s",
                conversation.bot_id,
                conversation.line_user_id,
                conversation.summary_message_count,
            )
        except Exception as exc:
            logger.warning("AI 上下文：儲存 rolling summary 失敗: %s", exc)

    @classmethod
    async def _summarize_messages(
        cls,
        previous_summary: str,
        messages: List[NormalizedMessage],
    ) -> str:
        transcript = cls._format_messages_for_control(messages, limit=80)
        if not transcript:
            return previous_summary

        if not settings.GROQ_API_KEY:
            return cls._fallback_summary(previous_summary, messages)

        prompt = (
            "既有摘要：\n"
            f"{previous_summary.strip() or '（無）'}\n\n"
            "新增舊對話：\n"
            f"{transcript}\n\n"
            "請輸出更新後摘要。"
        )
        try:
            summary = await GroqService.ask_groq_with_retry(
                prompt,
                context_text="",
                model=cls.CONTROL_MODEL,
                system_prompt=cls.SUMMARY_SYSTEM_PROMPT,
                max_tokens=900,
                context_kind="control",
            )
            return (summary or "").strip() or cls._fallback_summary(previous_summary, messages)
        except Exception as exc:
            logger.warning("AI 上下文：LLM 摘要失敗，使用保守摘要: %s", exc)
            return cls._fallback_summary(previous_summary, messages)

    @classmethod
    def _fallback_summary(cls, previous_summary: str, messages: List[NormalizedMessage]) -> str:
        lines = [previous_summary.strip()] if previous_summary and previous_summary.strip() else []
        compact = cls._format_messages_for_control(messages[-20:], limit=20)
        if compact:
            lines.append("近期舊對話重點：\n" + compact)
        return "\n\n".join(lines)[-cls.SUMMARY_MAX_CHARS :]

    @classmethod
    async def _build_standalone_query(
        cls,
        *,
        current_query: str,
        rolling_summary: Optional[str],
        recent_messages: List[NormalizedMessage],
    ) -> str:
        query = current_query.strip()
        if not query:
            return query

        if not settings.GROQ_API_KEY or (not rolling_summary and not recent_messages):
            return query

        recent_text = cls._format_messages_for_control(recent_messages, limit=8)
        prompt = (
            "對話摘要：\n"
            f"{(rolling_summary or '').strip() or '（無）'}\n\n"
            "最近對話：\n"
            f"{recent_text or '（無）'}\n\n"
            "目前用戶訊息：\n"
            f"{query}\n\n"
            "改寫後查詢："
        )
        try:
            rewritten = await GroqService.ask_groq_with_retry(
                prompt,
                context_text="",
                model=cls.CONTROL_MODEL,
                system_prompt=cls.STANDALONE_QUERY_SYSTEM_PROMPT,
                max_tokens=256,
                context_kind="control",
            )
            rewritten = (rewritten or "").strip().strip('"').strip()
            return rewritten or query
        except Exception as exc:
            logger.warning("AI 上下文：standalone query 生成失敗，使用原問題: %s", exc)
            return query

    @classmethod
    async def _ensure_recent_memory_index(
        cls,
        db: AsyncSession,
        bot_id: str,
        line_user_id: str,
        prior_messages: List[NormalizedMessage],
    ) -> None:
        if not settings.OPENAI_API_KEY or not prior_messages:
            return

        candidates = [
            message for message in prior_messages[-settings.AI_MEMORY_INDEX_RECENT_MESSAGES :]
            if message.id and message.content and len(message.content) >= 4
        ]
        if not candidates:
            return

        try:
            bot_uuid = UUID(str(bot_id))
            message_ids = [message.id for message in candidates]
            result = await db.execute(
                select(ConversationMemoryEmbedding.message_id).where(
                    ConversationMemoryEmbedding.bot_id == bot_uuid,
                    ConversationMemoryEmbedding.line_user_id == line_user_id,
                    ConversationMemoryEmbedding.message_id.in_(message_ids),
                )
            )
            existing_ids = {str(value) for value in result.scalars().all()}
            missing = [message for message in candidates if message.id not in existing_ids]
            if not missing:
                return

            embeddings = await embed_texts([message.content for message in missing], adaptive=True)
            for message, embedding in zip(missing, embeddings):
                db.add(
                    ConversationMemoryEmbedding(
                        bot_id=bot_uuid,
                        line_user_id=line_user_id,
                        message_id=message.id,
                        sender_type=message.sender_type,
                        message_type=message.message_type,
                        content=message.content[: cls.MEMORY_CONTENT_MAX_CHARS],
                        embedding=embedding,
                        embedding_model=settings.EMBEDDING_MODEL,
                        embedding_dimensions=str(settings.EMBEDDING_DIMENSIONS),
                        message_timestamp=message.timestamp,
                    )
                )
            await db.commit()
            logger.info("AI 上下文：已索引 %s 筆對話記憶", len(missing))
        except Exception as exc:
            await db.rollback()
            logger.warning("AI 上下文：對話記憶索引失敗，略過語意記憶: %s", exc)

    @classmethod
    async def _retrieve_relevant_memories(
        cls,
        *,
        db: AsyncSession,
        bot_id: str,
        line_user_id: str,
        query: str,
        exclude_message_ids: Set[str],
    ) -> List[Dict[str, Any]]:
        if not settings.OPENAI_API_KEY or not query.strip():
            return []

        try:
            bot_uuid = UUID(str(bot_id))
            query_embedding = await embed_text(query, use_cache=True)
            distance = ConversationMemoryEmbedding.embedding.cosine_distance(query_embedding).label("distance")
            stmt = (
                select(
                    ConversationMemoryEmbedding.message_id,
                    ConversationMemoryEmbedding.sender_type,
                    ConversationMemoryEmbedding.content,
                    ConversationMemoryEmbedding.message_timestamp,
                    distance,
                )
                .where(
                    ConversationMemoryEmbedding.bot_id == bot_uuid,
                    ConversationMemoryEmbedding.line_user_id == line_user_id,
                    ConversationMemoryEmbedding.embedding.is_not(None),
                )
                .order_by(distance.asc())
                .limit(max(0, settings.AI_MEMORY_RETRIEVAL_TOP_K))
            )
            if exclude_message_ids:
                stmt = stmt.where(~ConversationMemoryEmbedding.message_id.in_(exclude_message_ids))

            result = await db.execute(stmt)
            memories = []
            for row in result.all():
                memories.append(
                    {
                        "message_id": row.message_id,
                        "sender_type": row.sender_type,
                        "content": row.content,
                        "timestamp": row.message_timestamp,
                        "distance": float(row.distance) if row.distance is not None else None,
                    }
                )
            return memories
        except Exception as exc:
            await db.rollback()
            logger.warning("AI 上下文：對話記憶檢索失敗: %s", exc)
            return []

    @staticmethod
    def _format_retrieved_memories(memories: List[Dict[str, Any]]) -> str:
        if not memories:
            return ""

        lines: List[str] = []
        for item in memories:
            role = "AI助手" if item.get("sender_type") == "bot" else "用戶"
            timestamp = item.get("timestamp")
            timestamp_text = timestamp.isoformat() if hasattr(timestamp, "isoformat") else ""
            prefix = f"{role}"
            if timestamp_text:
                prefix += f" @ {timestamp_text}"
            lines.append(f"{prefix}: {str(item.get('content') or '').strip()}")
        return "\n".join(lines)

    @staticmethod
    def _messages_to_prompt_history(messages: List[NormalizedMessage]) -> List[Dict[str, str]]:
        return [
            {"role": message.role, "content": message.content}
            for message in messages
            if message.content
        ]

    @classmethod
    def _pack_prompt_history(
        cls,
        *,
        rolling_summary: Optional[str],
        retrieved_memory: str,
        recent_messages: List[NormalizedMessage],
        model: str,
    ) -> List[Dict[str, str]]:
        counter = TokenCounter(model)
        budget = max(1000, settings.AI_CONTEXT_TOKEN_BUDGET)
        packed: List[Dict[str, str]] = []
        used = 0

        def try_add(item: Dict[str, str], append: bool = True) -> bool:
            nonlocal used
            tokens = counter.count_tokens(item.get("content", "")) + 8
            if used + tokens > budget:
                return False
            if append:
                packed.append(item)
            else:
                packed.insert(0, item)
            used += tokens
            return True

        if rolling_summary and rolling_summary.strip():
            try_add({
                "role": "system",
                "content": "長期對話摘要：\n" + rolling_summary.strip(),
            })

        if retrieved_memory and retrieved_memory.strip():
            try_add({
                "role": "system",
                "content": "與目前問題語意相關的舊對話片段：\n" + retrieved_memory.strip(),
            })

        recent_items = cls._messages_to_prompt_history(recent_messages)
        selected_recent: List[Dict[str, str]] = []
        for item in reversed(recent_items):
            tokens = counter.count_tokens(item.get("content", "")) + 8
            if used + tokens > budget:
                break
            selected_recent.insert(0, item)
            used += tokens

        packed.extend(selected_recent)
        return packed

    @staticmethod
    def _format_messages_for_control(messages: List[NormalizedMessage], limit: int) -> str:
        lines: List[str] = []
        for message in messages[-limit:]:
            if message.role == "assistant":
                role = "AI"
            elif message.role == "admin":
                role = "管理者"
            else:
                role = "用戶"
            lines.append(f"{role}: {message.content}")
        return "\n".join(lines)
