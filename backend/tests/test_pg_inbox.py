"""Optional integration check run by worker/test/runtime.test.mjs on its disposable PG."""
import os
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest


@pytest.mark.skipif(not os.getenv("INBOX_TEST_BOT"), reason="requires isolated Worker integration database")
def test_pg_inbox_api():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.api.api_v1 import inbox, inbox_sources, inbox_releases

    app = FastAPI()
    app.include_router(inbox.router, prefix="/bots")
    app.include_router(inbox_sources.router, prefix="/bots")
    app.include_router(inbox_releases.router, prefix="/bots")
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
        msg = detail["items"][0]
        assert msg["draft_state"] == "ready" and msg["source_title"] == "門市資訊"
        assert msg["source_excerpt"] == msg["draft_body"]
        import psycopg2
        with psycopg2.connect(host="127.0.0.1", port=os.environ["DB_PORT"], dbname="postgres",
                              user="postgres", password=os.environ["DB_PASSWORD"]) as pg:
            with pg.cursor() as cursor:
                cursor.execute("UPDATE knowledge_chunks SET content='已修訂'")
        stale = client.get(f"{endpoint}/{thread}/messages").json()["items"][0]
        assert stale["draft_state"] == "stale" and stale["draft_body"] is None
        draft_url = f"{endpoint}/{thread}/messages/{msg['seq']}/draft"
        for _ in range(2):
            assert client.post(draft_url).status_code == 202
        import httpx

        def tick():
            response = httpx.post(os.environ["INBOX_TEST_URL"] + "/internal/local-draft-tick",
                                  headers={"Authorization": "Bearer " + os.environ["INBOX_TEST_TICK"]})
            assert response.status_code == 204

        with pg, pg.cursor() as cursor:
            cursor.execute("SELECT id FROM knowledge_documents WHERE bot_id=%s",(os.environ["INBOX_TEST_BOT"],))
            original = cursor.fetchone()[0]
            cursor.execute("UPDATE knowledge_chunks SET content='營業時間為週一至週五九點到六點。'")
        source_url = f"{endpoint}/sources/{original}"
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
        # A gradual upgrade must keep unrelated old documents searchable.
        with pg, pg.cursor() as cursor:
            old_doc, old_chunk = str(uuid4()), str(uuid4())
            cursor.execute("INSERT INTO knowledge_documents(id,bot_id,title) VALUES(%s,%s,'客服值班')",
                           (old_doc,os.environ["INBOX_TEST_BOT"]))
            cursor.execute("INSERT INTO knowledge_chunks(id,document_id,bot_id,content) VALUES(%s,%s,%s,'營業時間可洽值班客服')",
                           (old_chunk,old_doc,os.environ["INBOX_TEST_BOT"]))
        assert client.post(draft_url).status_code == 202
        tick()
        assert current()["source_title"] == "客服值班" and current()["source_version"] is None
        # The saved Flex source can change while a published replay stays reproducible.
        from psycopg2.extras import Json
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
        assert client.put(other + "/sources/" + old_doc, files={"file": ("另一個.txt", b"hello")},
                          data={"base_version": "0"}).status_code == 404
        url = f"{endpoint}/{thread}/takeover"
        assert client.post(url, json={"ownership_epoch": 9}).status_code == 409
        for _ in range(2):
            result = client.post(url, json={"ownership_epoch": 0})
            assert result.json() == {"owner_mode": "human", "ownership_epoch": 1}
        assert client.post(draft_url).status_code == 409
        assert client.get(f"{endpoint}/{thread}/messages").json()["items"][0]["can_draft"] is False
        app.dependency_overrides[inbox.get_current_user_async] = lambda: SimpleNamespace(id=uuid4())
        assert client.post(draft_url).status_code == 404
        assert client.get(endpoint).status_code == 404
        assert client.get(f"{endpoint}/{thread}/messages").status_code == 404
        assert client.post(url, json={"ownership_epoch": 1}).status_code == 404


def test_locate_source_sections():
    from io import BytesIO
    from hashlib import sha256
    from docx import Document
    from PyPDF2 import PdfWriter
    from PyPDF2.generic import DecodedStreamObject, DictionaryObject, NameObject
    from app.api.api_v1.inbox_sources import extract_sections

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
