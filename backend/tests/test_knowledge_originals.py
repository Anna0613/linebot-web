"""Run the batch CLI against a disposable MinIO, PostgreSQL and Miniflare."""

import hashlib
import json
import os
import secrets
import socket
import subprocess
import sys
import time
from io import BytesIO
from uuid import uuid4

import httpx
import psycopg2
import pytest
from minio import Minio


@pytest.fixture
def minio_server(tmp_path):
    binary = os.getenv("INBOX_TEST_MINIO_BIN")
    if not binary or not os.getenv("INBOX_TEST_URL"):
        pytest.skip(
            "requires the local Worker integration harness and a MinIO server binary"
        )
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        endpoint = "127.0.0.1:" + str(sock.getsockname()[1])
    secret = secrets.token_hex(20)
    process = subprocess.Popen(
        [binary, "server", "--address", endpoint, str(tmp_path / "objects")],
        env={
            **os.environ,
            "MINIO_ROOT_USER": "migrationtest",
            "MINIO_ROOT_PASSWORD": secret,
            "MINIO_BROWSER": "off",
        },
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        with httpx.Client(trust_env=False) as http:
            for _ in range(100):
                if process.poll() is not None:
                    pytest.fail("MinIO stopped during startup")
                try:
                    if http.get(
                        "http://" + endpoint + "/minio/health/ready", timeout=1
                    ).is_success:
                        break
                except httpx.TransportError:
                    pass
                time.sleep(0.1)
            else:
                pytest.fail("MinIO readiness timed out")
        yield endpoint, secret
    finally:
        process.terminate()
        process.wait(timeout=15)


def test_migrate_local_originals(minio_server, tmp_path):
    endpoint, secret = minio_server
    client = Minio(
        endpoint, access_key="migrationtest", secret_key=secret, secure=False
    )
    src, dst = "legacy-originals", "audit-target"
    client.make_bucket(src)
    client.make_bucket(dst)
    bot = os.environ["INBOX_TEST_BOT"]
    pgurl = f"postgresql://postgres:{os.environ['DB_PASSWORD']}@127.0.0.1:{os.environ['DB_PORT']}/postgres"
    env = {
        **os.environ,
        "MIGRATION_DATABASE_URL": pgurl,
        "MIGRATION_MINIO_URL": "http://" + endpoint,
        "MIGRATION_MINIO_BUCKET": src,
        "MIGRATION_MINIO_ACCESS_KEY": "migrationtest",
        "MIGRATION_MINIO_SECRET_KEY": secret,
        "LOCAL_R2_AUDIT_URL": os.environ["INBOX_TEST_URL"],
        "LOCAL_R2_AUDIT_TOKEN": os.environ["INBOX_TEST_TICK"],
    }
    manifest = tmp_path / "manifest.json"

    def cli(mode, *args, code=0, config=env, all_bots=False):
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "scripts.migration.knowledge_originals",
                mode,
                *(["--all"] if all_bots else ["--bot", bot]),
                "--manifest",
                str(manifest),
                *args,
            ],
            env=config,
            capture_output=True,
            text=True,
            timeout=20,
        )
        assert result.returncode == code, (result.stdout, result.stderr)
        return [json.loads(line) for line in result.stdout.splitlines()]

    def put(bucket, key, raw):
        client.put_object(bucket, key, BytesIO(raw), len(raw))

    def tick():
        reply = httpx.post(
            env["LOCAL_R2_AUDIT_URL"] + "/internal/local-draft-tick",
            headers={"Authorization": "Bearer " + env["LOCAL_R2_AUDIT_TOKEN"]},
            trust_env=False,
        )
        assert reply.status_code == 204

    keys = [f"{bot}/knowledge/{uuid4()}.txt" for _ in range(2)]
    originals = ["一號原檔".encode(), "二號原檔".encode()]
    docs = [str(uuid4()), str(uuid4())]
    with psycopg2.connect(pgurl) as pg, pg.cursor() as c:
        for doc, key, raw in zip(docs, keys, originals):
            put(src, key, raw)
            c.execute(
                "INSERT INTO knowledge_documents(id,bot_id,original_file_name,source_type,object_path) VALUES (%s,%s,'同名.txt','file',%s)",
                (doc, bot, key),
            )
    assert cli("inventory")[-1]["counts"]["ready"] == 2
    snapshot = json.loads(manifest.read_text())
    assert {e["key"] for e in snapshot["documents"]} == set(keys)
    assert {e["sha256"] for e in snapshot["documents"]} == {
        hashlib.sha256(v).hexdigest() for v in originals
    }
    put(src, "global/knowledge/unassigned.txt", b"unassigned")
    put(src, "legacy-media/photo.jpg", b"not knowledge")
    all_counts = cli("inventory", all_bots=True, code=2)[-1]["counts"]
    assert all_counts["unassigned_object"] == 1
    full = json.loads(manifest.read_text())
    assert full["unassigned_objects"] == ["global/knowledge/unassigned.txt"]
    assert len(full["bots"][bot]["documents"]) == 2
    # Force a real source change between inventory and the first write.
    put(src, keys[0], b"different")
    partial = cli("apply", code=2)[-1]["counts"]
    assert partial["source_changed"] == 1 and partial["queued"] == 1
    put(src, keys[0], originals[0])
    # Reset just the disposable pending row to exercise --limit and restart independently.
    with psycopg2.connect(pgurl) as pg, pg.cursor() as c:
        c.execute(
            "DELETE FROM inbox_sources WHERE id=%s AND active_version=0", (docs[1],)
        )
    batch = cli("apply", "--limit", "1", code=2)[-1]["counts"]
    assert batch["queued"] == batch["deferred"] == 1
    assert cli("apply")[-1]["counts"]["already_queued"] == 1
    assert cli("verify", code=2)[-1]["counts"]["awaiting_worker"] == 2
    tick()
    tick()
    assert cli("apply")[-1]["counts"]["published"] == 2
    verified = cli("verify")
    assert verified[-1]["counts"]["verified"] == 2
    for row in verified[:-1]:
        assert row["inventory_sha256"] == row["minio_sha256"] == row["r2_raw_sha256"]
        assert row["expected_text_sha256"] == row["r2_text_sha256"]
    put(src, keys[0], b"changed")
    assert cli("verify", code=2)[-1]["counts"]["source_changed"] == 1
    pinned_manifest = manifest.read_bytes()
    cli("inventory")
    assert cli("apply", code=2)[-1]["counts"]["publication_conflict"] == 1
    manifest.write_bytes(pinned_manifest)
    put(src, keys[0], originals[0])

    # Exercise the S3 destination path using incorrect, missing and then correct object bytes.
    s3env = {
        **env,
        "MIGRATION_R2_URL": "http://" + endpoint,
        "MIGRATION_R2_ACCESS_KEY": "migrationtest",
        "MIGRATION_R2_SECRET_KEY": secret,
        "MIGRATION_R2_BUCKET": dst,
    }
    del s3env["LOCAL_R2_AUDIT_URL"]
    for doc, raw in zip(docs, originals):
        prefix = f"sources/{bot}/{doc}/1/"
        put(dst, prefix + hashlib.sha256(raw).hexdigest(), b"corrupt")
    assert cli("verify", config=s3env, code=2)[-1]["counts"]["raw_hash_mismatch"] == 2
    for doc, raw in zip(docs, originals):
        put(dst, f"sources/{bot}/{doc}/1/" + hashlib.sha256(raw).hexdigest(), raw)
    assert cli("verify", config=s3env, code=2)[-1]["counts"]["text_missing"] == 2
    for doc, raw in zip(docs, originals):
        norm = raw + b"\n"
        put(dst, f"sources/{bot}/{doc}/1/" + hashlib.sha256(norm).hexdigest(), norm)
    assert cli("verify", config=s3env)[-1]["counts"]["verified"] == 2

    put(src, f"{bot}/knowledge/unreferenced.pdf", b"orphan")
    client.remove_object(src, keys[1])
    with psycopg2.connect(pgurl) as pg, pg.cursor() as c:
        c.execute(
            "UPDATE knowledge_documents SET object_path=%s WHERE id=%s",
            (f"{uuid4()}/knowledge/foreign.txt", docs[0]),
        )
    delta = cli("verify", code=2)[-1]["counts"]
    assert (
        delta["catalog_changed"] == 1
        and delta["missing_object"] == 1
        and delta["orphan"] == 2
    )
    counts = cli("inventory", code=2)[-1]["counts"]
    assert counts["invalid_path"] == counts["missing_object"] == 1
    assert counts["orphan"] == 2
