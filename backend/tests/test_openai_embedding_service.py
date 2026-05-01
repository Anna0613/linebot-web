from types import SimpleNamespace

import pytest

from app.config import settings
from app.services.embedding.openai_embedding_service import OpenAIEmbeddingService


@pytest.mark.asyncio
async def test_embed_many_preserves_openai_response_order(monkeypatch):
    monkeypatch.setattr(settings, "EMBEDDING_MODEL", "text-embedding-3-small")
    monkeypatch.setattr(settings, "EMBEDDING_DIMENSIONS", 3)
    monkeypatch.setattr(settings, "EMBEDDING_BATCH_SIZE", 64)
    monkeypatch.setattr(settings, "EMBEDDING_MAX_RETRIES", 0)

    captured = {}

    class FakeEmbeddings:
        async def create(self, input, model, encoding_format):
            captured["input"] = input
            captured["model"] = model
            captured["encoding_format"] = encoding_format
            return SimpleNamespace(
                data=[
                    SimpleNamespace(index=1, embedding=[4, 5, 6]),
                    SimpleNamespace(index=0, embedding=[1, 2, 3]),
                ],
                usage=SimpleNamespace(prompt_tokens=4, total_tokens=4),
            )

    fake_client = SimpleNamespace(embeddings=FakeEmbeddings())
    monkeypatch.setattr(
        OpenAIEmbeddingService,
        "_get_client",
        classmethod(lambda cls: fake_client),
    )

    result = await OpenAIEmbeddingService.embed_many(["first", "second"])

    assert result == [[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]]
    assert captured == {
        "input": ["first", "second"],
        "model": "text-embedding-3-small",
        "encoding_format": "float",
    }


@pytest.mark.asyncio
async def test_embed_many_rejects_wrong_dimensions(monkeypatch):
    monkeypatch.setattr(settings, "EMBEDDING_MODEL", "text-embedding-3-small")
    monkeypatch.setattr(settings, "EMBEDDING_DIMENSIONS", 3)
    monkeypatch.setattr(settings, "EMBEDDING_BATCH_SIZE", 64)
    monkeypatch.setattr(settings, "EMBEDDING_MAX_RETRIES", 0)

    class FakeEmbeddings:
        async def create(self, input, model, encoding_format):
            return SimpleNamespace(
                data=[SimpleNamespace(index=0, embedding=[1, 2])],
                usage=SimpleNamespace(prompt_tokens=1, total_tokens=1),
            )

    fake_client = SimpleNamespace(embeddings=FakeEmbeddings())
    monkeypatch.setattr(
        OpenAIEmbeddingService,
        "_get_client",
        classmethod(lambda cls: fake_client),
    )

    with pytest.raises(ValueError, match="dimension mismatch"):
        await OpenAIEmbeddingService.embed_many(["text"])
