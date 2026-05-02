from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.bot import Bot
from app.services.bot.bot_service import BotService, DUPLICATE_LINE_BOT_DETAIL


class _ScalarResult:
    def __init__(self, rows):
        self._rows = rows

    def first(self):
        return self._rows[0] if self._rows else None

    def all(self):
        return list(self._rows)


class _ExecuteResult:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return _ScalarResult(self._rows)


class _FakeAsyncSession:
    def __init__(self, responses):
        self._responses = list(responses)
        self.statements = []

    async def execute(self, statement):
        self.statements.append(statement)
        return self._responses.pop(0)


@pytest.mark.asyncio
async def test_ensure_line_bot_not_registered_raises_for_existing_identity():
    existing_bot = Bot(
        id=uuid4(),
        user_id=uuid4(),
        name="Existing Bot",
        channel_token="existing-token",
        channel_secret="existing-secret",
        line_bot_user_id="U123",
    )
    db = _FakeAsyncSession([_ExecuteResult([existing_bot])])

    with pytest.raises(HTTPException) as exc_info:
        await BotService._ensure_line_bot_not_registered(
            db,
            "U123",
            channel_token="new-token",
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == DUPLICATE_LINE_BOT_DETAIL


@pytest.mark.asyncio
async def test_ensure_line_bot_not_registered_allows_new_identity_without_legacy_rows():
    db = _FakeAsyncSession([
        _ExecuteResult([]),
        _ExecuteResult([]),
    ])

    await BotService._ensure_line_bot_not_registered(
        db,
        "U456",
        channel_token="new-token",
    )

    assert len(db.statements) == 2
