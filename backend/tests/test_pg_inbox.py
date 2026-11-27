"""Optional integration check run by worker/test/runtime.test.mjs on its disposable PG."""
import os
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest


@pytest.mark.skipif(not os.getenv("INBOX_TEST_BOT"), reason="requires isolated Worker integration database")
def test_pg_inbox_api():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.api.api_v1 import inbox

    app = FastAPI()
    app.include_router(inbox.router, prefix="/bots")
    owner = UUID(os.environ["INBOX_TEST_OWNER"])
    app.dependency_overrides[inbox.get_current_user_async] = lambda: SimpleNamespace(id=owner)
    endpoint = "/bots/" + os.environ["INBOX_TEST_BOT"] + "/inbox"
    with TestClient(app) as client:
        listing = client.get(endpoint)
        assert listing.status_code == 200, listing.text
        assert listing.headers["Cache-Control"] == "private, no-store"
        thread = listing.json()["items"][0]["id"]
        detail = client.get(f"{endpoint}/{thread}/messages").json()
        assert detail["items"][0]["body"] == "營業時間"
        url = f"{endpoint}/{thread}/takeover"
        assert client.post(url, json={"ownership_epoch": 9}).status_code == 409
        for _ in range(2):
            result = client.post(url, json={"ownership_epoch": 0})
            assert result.json() == {"owner_mode": "human", "ownership_epoch": 1}
        app.dependency_overrides[inbox.get_current_user_async] = lambda: SimpleNamespace(id=uuid4())
        assert client.get(endpoint).status_code == 404
        assert client.get(f"{endpoint}/{thread}/messages").status_code == 404
        assert client.post(url, json={"ownership_epoch": 1}).status_code == 404
