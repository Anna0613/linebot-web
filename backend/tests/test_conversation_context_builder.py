from datetime import datetime, timedelta

from app.config import settings
from app.services.ai.prompt_templates import PromptTemplates
from app.services.conversation.context_builder import (
    ConversationContextBuilder,
    NormalizedMessage,
)


def _msg(index: int, role: str, content: str) -> NormalizedMessage:
    sender_type = "bot" if role == "assistant" else role
    return NormalizedMessage(
        id=f"m{index}",
        role=role,
        content=content,
        sender_type=sender_type,
        message_type="text",
        timestamp=datetime.utcnow() + timedelta(seconds=index),
    )


def test_effective_history_count_uses_nonzero_default(monkeypatch):
    monkeypatch.setattr(settings, "AI_DEFAULT_HISTORY_MESSAGES", 12)
    monkeypatch.setattr(settings, "AI_MAX_HISTORY_MESSAGES", 200)

    assert ConversationContextBuilder._effective_history_count(None) == 12
    assert ConversationContextBuilder._effective_history_count(0) == 0
    assert ConversationContextBuilder._effective_history_count(999) == 200


def test_exclude_current_message_removes_latest_matching_user_message():
    messages = [
        _msg(1, "user", "我想看 A 方案"),
        _msg(2, "assistant", "A 方案包含基本支援"),
        _msg(3, "user", "那價格呢？"),
    ]

    prior, current_message_id = ConversationContextBuilder._exclude_current_message(
        messages,
        "那價格呢？",
    )

    assert current_message_id == "m3"
    assert [message.id for message in prior] == ["m1", "m2"]


def test_pack_prompt_history_keeps_summary_memory_and_recent_order(monkeypatch):
    monkeypatch.setattr(settings, "AI_CONTEXT_TOKEN_BUDGET", 4000)
    recent = [
        _msg(1, "user", "我想比較 A 和 B 方案"),
        _msg(2, "assistant", "A 適合小團隊，B 適合進階整合"),
    ]

    packed = ConversationContextBuilder._pack_prompt_history(
        rolling_summary="用戶正在比較 A/B 方案。",
        retrieved_memory="用戶曾詢問 B 方案是否支援 API。",
        recent_messages=recent,
        model="llama-3.3-70b-versatile",
    )

    assert packed[0]["role"] == "system"
    assert "長期對話摘要" in packed[0]["content"]
    assert packed[1]["role"] == "system"
    assert "語意相關" in packed[1]["content"]
    assert packed[-2:] == [
        {"role": "user", "content": "我想比較 A 和 B 方案"},
        {"role": "assistant", "content": "A 適合小團隊，B 適合進階整合"},
    ]


def test_prompt_history_labels_line_user_as_user_not_admin():
    rendered = PromptTemplates.wrap_conversation_history([
        {"role": "user", "content": "請問價格？"},
        {"role": "assistant", "content": "請問你要哪個方案？"},
        {"role": "admin", "content": "人工客服已接手"},
    ])

    assert "用戶: 請問價格？" in rendered
    assert "AI助手: 請問你要哪個方案？" in rendered
    assert "管理者: 人工客服已接手" in rendered
