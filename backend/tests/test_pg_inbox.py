"""Optional integration check run by worker/test/runtime.test.mjs on its disposable PG."""
import os
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest


@pytest.mark.skipif(not os.getenv("INBOX_TEST_BOT"), reason="requires isolated Worker integration database")
def test_pg_inbox_api():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.api.api_v1 import bot_analytics, inbox, inbox_sources, inbox_releases, users

    app = FastAPI()
    app.include_router(users.router, prefix="/users")
    app.include_router(bot_analytics.router, prefix="/bots")
    app.include_router(inbox.router, prefix="/bots")
    app.include_router(inbox_sources.router, prefix="/bots")
    app.include_router(inbox_releases.router, prefix="/bots")
    owner = UUID(os.environ["INBOX_TEST_OWNER"])
    app.dependency_overrides[inbox.get_current_user_async] = lambda: SimpleNamespace(id=owner)
    endpoint = "/bots/" + os.environ["INBOX_TEST_BOT"] + "/inbox"
    with TestClient(app) as client:
        feedback = "/users/feedback/" + str(uuid4())
        data = {"category":"一般意見","message":"請新增標籤"}
        assert client.put(feedback, json=data).status_code == 201
        assert client.put(feedback, json=data).status_code == 201
        assert client.put(feedback, json={**data, "message":"其他"}).status_code == 409
        assert client.put(feedback, json={**data, "message":"  "}).status_code == 422
        listing = client.get(endpoint)
        assert listing.status_code == 200, listing.text
        assert listing.headers["Cache-Control"] == "private, no-store"
        thread = listing.json()["items"][0]["id"]
        detail = client.get(f"{endpoint}/{thread}/messages").json()
        assert detail["items"][0]["body"] == "營業時間"
        msg = detail["items"][0]
        assert msg["draft_state"] == "handoff" and msg["draft_body"] is None
        assert client.get(endpoint + "/sources").json() == []
        assert client.get(endpoint + "/releases").json() == []
        draft_url = f"{endpoint}/{thread}/messages/{msg['seq']}/draft"
        for _ in range(2):
            assert client.post(draft_url).status_code == 202
        import httpx

        def tick():
            response = httpx.post(os.environ["INBOX_TEST_URL"] + "/internal/local-draft-tick",
                                  headers={"Authorization": "Bearer " + os.environ["INBOX_TEST_TICK"]})
            assert response.status_code == 204

        source_id = str(uuid4())
        source_url = f"{endpoint}/sources/{source_id}"
        def publish(content, base):
            return client.put(source_url, files={"file": ("門市.md", content.encode())},
                              data={"base_version": str(base)})

        def current():
            return client.get(f"{endpoint}/{thread}/messages").json()["items"][0]

        v1 = "門市公告\n營業時間是上午十點。"
        assert publish(v1, 0).status_code == 202
        assert publish(v1, 0).status_code == 202
        assert publish("不同版本", 0).status_code == 409
        assert client.get(endpoint + "/sources").json()[0]["active_version"] == 0
        tick()
        assert client.get(endpoint + "/sources").json()[0]["active_version"] == 1
        assert current()["source_version"] == 1 and current()["source_location"] == "第 2 行"
        assert current()["draft_body"] == "營業時間是上午十點。"
        assert publish("營業時間是上午十一點。", 1).status_code == 202
        assert current()["draft_state"] == "ready"
        tick()
        assert current()["draft_state"] == "stale" and current()["draft_body"] is None
        assert client.post(draft_url).status_code == 202
        tick()
        assert current()["draft_body"] == "營業時間是上午十一點。"
        assert current()["source_version"] == 2
        assert client.delete(source_url + "?version=1").status_code == 409
        app.dependency_overrides[inbox.get_current_user_async] = lambda: SimpleNamespace(id=uuid4())
        assert publish("其他頻道", 2).status_code == 404
        assert client.delete(source_url + "?version=2").status_code == 404
        app.dependency_overrides[inbox.get_current_user_async] = lambda: SimpleNamespace(id=owner)
        assert client.delete(source_url + "?version=2").status_code == 200
        assert current()["draft_state"] == "stale"
        assert client.post(draft_url).status_code == 202
        tick()
        assert current()["draft_state"] == "handoff"
        # The saved Flex source can change while a published replay stays reproducible.
        import psycopg2
        from psycopg2.extras import Json
        pg = psycopg2.connect(host="127.0.0.1", port=os.environ["DB_PORT"], dbname="postgres",
                              user="postgres", password=os.environ["DB_PASSWORD"])
        template_id, flex_id = str(uuid4()), str(uuid4())
        graph = {"schemaVersion":"workflow-graph/v1","nodes":[
            {"id":"start","type":"trigger.message","data":{}},
            {"id":"answer","type":"action.replyFlex","data":{"flexMessageId":flex_id}}],
            "edges":[{"source":"start","target":"answer","sourceHandle":"out"}]}
        contents = {"type":"bubble","body":{"type":"box","layout":"vertical","contents":[{"type":"text","text":"第一版"}]}}
        with pg, pg.cursor() as cursor:
            cursor.execute("INSERT INTO logic_templates VALUES (%s,%s,%s,'客服流程',%s)",
                           (template_id,os.environ["INBOX_TEST_BOT"],str(owner),Json(graph)))
            cursor.execute("INSERT INTO flex_messages VALUES (%s,%s,'門市卡',%s)",(flex_id,str(owner),Json(contents)))
        release_url = endpoint + "/releases/templates/" + template_id
        first = client.post(release_url).json()
        assert first["version"] == 1 and client.post(release_url).json() == first
        contents["body"]["contents"][0]["text"] = "第二版"
        with pg, pg.cursor() as cursor:
            cursor.execute("UPDATE flex_messages SET content=%s WHERE id=%s",(Json(contents),flex_id))
        second = client.post(release_url).json()
        assert second["version"] == 2 and len(client.get(endpoint + "/releases").json()) == 2
        frozen = client.get(endpoint + "/releases/" + first["id"]).json()
        assert frozen["flex"][0]["content"]["body"]["contents"][0]["text"] == "第一版"
        with pg, pg.cursor() as cursor:
            cursor.execute("UPDATE flex_messages SET user_id=%s WHERE id=%s",(str(uuid4()),flex_id))
        assert client.post(release_url).status_code == 422
        other_bot = str(uuid4())
        with pg, pg.cursor() as cursor:
            cursor.execute("INSERT INTO bots VALUES(%s,true,%s)",(other_bot,str(owner)))
        other = "/bots/" + other_bot + "/inbox"
        assert client.get(other + "/releases").json() == []
        assert client.get(other + "/releases/" + first["id"]).status_code == 404
        assert client.post(other + "/releases/templates/" + template_id).status_code == 404
        assert client.put(other + "/sources/" + source_id, files={"file": ("另一個.txt", b"hello")},
                          data={"base_version": "0"}).status_code == 404
        # This fixture normally exercises only inbox tables. Add contact-profile
        # columns used by the shared PostgreSQL reporting queries.
        with pg, pg.cursor() as cursor:
            cursor.execute("""CREATE TABLE line_bot_users(id uuid, bot_id uuid, line_user_id text,
                display_name text,picture_url text,status_message text,language text,is_followed boolean,
                first_interaction timestamptz,last_interaction timestamptz,interaction_count text)""")
        pg.close()
        friend = client.post(endpoint + "/contacts/U1/thread")
        assert friend.status_code == 200 and friend.json()["id"] == thread
        reply_url = f"{endpoint}/{thread}/replies"
        reply = {"client_key": str(uuid4()), "body": "您好，我是客服", "ownership_epoch": 1}
        assert client.post(reply_url, json=reply).status_code == 409
        url = f"{endpoint}/{thread}/takeover"
        assert client.post(url, json={"ownership_epoch": 9}).status_code == 409
        for _ in range(2):
            result = client.post(url, json={"ownership_epoch": 0})
            assert result.json() == {"owner_mode": "human", "ownership_epoch": 1}
        first = client.post(reply_url, json=reply)
        assert first.status_code == 202, first.text
        assert client.post(reply_url, json=reply).json() == first.json()
        assert client.post(reply_url, json={**reply, "body":"不同內容"}).status_code == 409
        tick()
        assert client.post(reply_url, json=reply).json()["state"] == "simulated"
        timeline = client.get(f"{endpoint}/{thread}/messages").json()["items"]
        assert len(timeline) == 2 and timeline[-1]["body"] == reply["body"]
        assert timeline[-1]["delivery_state"] == "simulated"

        from app.db.database_async import AsyncSessionLocal
        from app.services.conversation import inbox_reporting

        async def verify_reports():
            bot_id = UUID(os.environ["INBOX_TEST_BOT"])
            async with AsyncSessionLocal() as session:
                listing = await inbox_reporting.contacts(session, bot_id, 20, 0)
                assert [row["line_user_id"] for row in listing["users"]] == ["U1"]
                history, count = await inbox_reporting.history(session, bot_id, "U1", 20, 0)
                assert count == 2 and history[0]["sender_type"] == "admin"
                assert (await inbox_reporting.totals(session, bot_id, 7))["totalMessages"] == 2
                for hourly in (True, False):
                    buckets = await inbox_reporting.series(session, bot_id, 7, hourly)
                    assert sum(row["received"] for row in buckets) == 1
                    assert sum(row["sent"] for row in buckets) == 1
                    assert sum(row["active"] for row in buckets) == 1
                dashboard = await inbox_reporting.dashboard(session, bot_id, "week")
                assert dashboard["total_interactions"] == 2 and dashboard["active_users"] == 1
                assert sum(row["activeUsers"] for row in dashboard["activity_distribution"]) == 1
                assert not (await inbox_reporting.contacts(session, other_bot, 20, 0))["users"]
        client.portal.call(verify_reports)

        broadcast_url = endpoint.removesuffix("/inbox") + "/broadcast"
        campaign = {"message":"假日公告", "user_ids":["U1"], "client_key":str(uuid4())}
        selective = broadcast_url + "/selective"
        assert client.post(selective, json={**campaign, "user_ids":["other"]}).status_code == 422
        queued = client.post(selective, json=campaign)
        assert queued.status_code == 200 and queued.json()["state"] == "queued", queued.text
        assert client.post(selective, json=campaign).json() == queued.json()
        assert client.post(selective, json={**campaign, "message":"另一則"}).status_code == 409
        tick()
        assert client.post(selective, json=campaign).json()["state"] == "simulated"
        latest = client.get(f"{endpoint}/{thread}/messages").json()["items"]
        assert len(latest) == 3 and latest[-1]["delivery_state"] == "simulated"
        assert latest[-1]["body"] == "假日公告"
        everyone = {"message":"全體公告","client_key":str(uuid4())}
        assert client.post(broadcast_url, json=everyone).json()["state"] == "queued"
        tick()
        assert client.post(broadcast_url, json=everyone).json()["state"] == "simulated"
        assert len(client.get(f"{endpoint}/{thread}/messages").json()["items"]) == 3
        assert client.post(draft_url).status_code == 409
        assert client.get(f"{endpoint}/{thread}/messages").json()["items"][0]["can_draft"] is False
        app.dependency_overrides[inbox.get_current_user_async] = lambda: SimpleNamespace(id=uuid4())
        assert client.post(draft_url).status_code == 404
        assert client.post(reply_url, json=reply).status_code == 404
        assert client.get(endpoint).status_code == 404
        assert client.get(f"{endpoint}/{thread}/messages").status_code == 404
        assert client.post(url, json={"ownership_epoch": 1}).status_code == 404


def test_locate_source_sections():
    from io import BytesIO
    from hashlib import sha256
    from docx import Document
    from pypdf import PdfWriter
    from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject
    from app.services.knowledge.source_publication import extract_sections

    document = Document()
    document.add_paragraph("文件標題")
    document.add_table(rows=1, cols=1).cell(0, 0).text = "平日九點"
    word = BytesIO()
    document.save(word)
    pdf = PdfWriter()
    pdf.add_blank_page(width=100, height=100)
    page = pdf.pages[0]
    font = DictionaryObject({NameObject("/Type"):NameObject("/Font"),NameObject("/Subtype"):NameObject("/Type1"),
                             NameObject("/BaseFont"):NameObject("/Helvetica")})
    page[NameObject("/Resources")] = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F1"):font})})
    stream = DecodedStreamObject()
    stream.set_data(b"BT /F1 12 Tf 10 50 Td (Opening hours) Tj ET")
    page[NameObject("/Contents")] = pdf._add_object(stream)
    out = BytesIO()
    pdf.write(out)
    cases = [
        ("demo.pdf", out.getvalue(), "第 1 頁", "Opening hours"),
        ("demo.docx", word.getvalue(), "表 1 第 1 列", "平日九點"),
        ("demo.txt", "說明\r\n\r\n平日九點".encode("utf-8-sig"), "第 3 行", "平日九點"),
    ]
    for name, data, location, expected in cases:
        normalized, sections = extract_sections(name, data)
        part = next(p for p in sections if p["location"] == location)
        selected = normalized[part["pos"]:part["pos"] + part["size"]]
        assert selected.decode() == expected
        assert sha256(selected).hexdigest() == part["digest"]
