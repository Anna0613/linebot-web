"""Inventory, stage and reconcile one Bot's legacy MinIO knowledge originals."""

from contextlib import contextmanager
import argparse
import asyncio
import hashlib
import json
import os
import re
import sys
import tempfile
from collections import Counter
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit
from uuid import UUID

import httpx
from fastapi import HTTPException
from minio import Minio
from minio.error import S3Error
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.services.knowledge.source_publication import MAX_BYTES, stage_version

FORMAT = "botlyn-knowledge-originals/v1"
DIGEST = re.compile(r"[0-9a-f]{64}")
MISSING = {"NoSuchKey", "NoSuchObject", "NotFound"}
FIELDS = "id,bot_id,object_path,original_file_name,deleted_at"
SUCCESS = {
    "ready",
    "deleted",
    "queued",
    "already_queued",
    "published",
    "verified",
    "verified_archived",
}


def required(name):
    value = os.environ.get(name)
    if not value:
        raise ValueError(f"missing environment variable {name}")
    return value


class Bucket:
    def __init__(self, prefix):
        self.url = required(prefix + "_URL").rstrip("/")
        parts = urlsplit(self.url)
        if (
            parts.scheme not in ("https", "http")
            or not parts.hostname
            or parts.username
            or parts.password
            or parts.path
            or parts.query
            or parts.fragment
        ):
            raise ValueError(f"invalid {prefix}_URL")
        self.name = required(prefix + "_BUCKET")
        self.client = Minio(
            parts.netloc,
            secure=parts.scheme == "https",
            access_key=required(prefix + "_ACCESS_KEY"),
            secret_key=required(prefix + "_SECRET_KEY"),
            region=os.getenv(prefix + "_REGION"),
        )

    def objects(self, bot=None):
        prefix = f"{bot}/knowledge/" if bot else ""
        objects = self.client.list_objects(self.name, prefix=prefix, recursive=True)
        return {
            obj.object_name: obj.size
            for obj in objects
            if len(parts := obj.object_name.split("/", 2)) == 3
            and parts[1] == "knowledge"
            and not obj.object_name.endswith("/")
        }

    @contextmanager
    def open(self, key):
        response = self.client.get_object(self.name, key)
        try:
            yield response
        finally:
            response.close()
            response.release_conn()


def classify(row, bot):
    key = row["object_path"] or ""
    name = row["original_file_name"] or PurePosixPath(key).name
    entry = dict(id=str(row["id"]), key=key, name=name)
    if row["deleted_at"] is not None:
        return entry, "deleted"
    if not key:
        return entry, "missing_path"
    if (
        not key.startswith(f"{bot}/knowledge/")
        or any(s in ("", ".", "..") for s in key.split("/"))
        or "\\" in key
    ):
        return entry, "invalid_path"
    return entry, "ready"


async def documents(sessions, bot):
    async with sessions() as db:
        if not await db.scalar(
            text("SELECT EXISTS(SELECT 1 FROM bots WHERE id=:bot)"), {"bot": bot}
        ):
            raise ValueError("unknown bot")
        rows = await db.execute(
            text(
                f"SELECT {FIELDS} FROM knowledge_documents WHERE bot_id=:bot AND source_type='file' ORDER BY id"
            ),
            {"bot": bot},
        )
        return rows.mappings().all()


def source_bytes(source, entry):
    try:
        with source.open(entry["key"]) as stream:
            raw = stream.read(MAX_BYTES + 1)
    except S3Error as exc:
        if exc.code in MISSING:
            return None, "missing_object"
        raise
    if len(raw) > MAX_BYTES:
        return None, "oversized"
    return raw, "ready"


def inventory(rows, bot, source, objects):
    entries = []
    for row in rows:
        entry, status = classify(row, bot)
        key = entry["key"]
        if status == "ready":
            if key not in objects:
                status = "missing_object"
            elif objects[key] > MAX_BYTES:
                status = "oversized"
            else:
                raw, status = source_bytes(source, entry)
                if raw is not None:
                    entry.update(size=len(raw), sha256=hashlib.sha256(raw).hexdigest())
                    if len(raw) != objects[key]:
                        status = "changed_during_inventory"
                    elif PurePosixPath(entry["name"]).suffix.lower() not in (
                        ".pdf",
                        ".docx",
                        ".md",
                        ".txt",
                    ):
                        status = "unsupported"
            if "size" not in entry and key in objects:
                entry["size"] = objects[key]
        entries.append(dict(entry, status=status))
    return dict(
        format=FORMAT,
        bot=bot,
        source_url=source.url,
        bucket=source.name,
        documents=entries,
        orphans=sorted(objects.keys() - {e["key"] for e in entries}),
    )


async def inventory_all(sessions, source, counts):
    async with sessions() as db:
        rows = (
            (
                await db.execute(
                    text(
                        f"SELECT {FIELDS} FROM knowledge_documents WHERE source_type='file' ORDER BY id"
                    )
                )
            )
            .mappings()
            .all()
        )
    per_bot, unassigned = {}, []
    for row in rows:
        if row["bot_id"] is None:
            unassigned.append(
                {
                    "id": str(row["id"]),
                    "key": row["object_path"],
                    "deleted": row["deleted_at"] is not None,
                }
            )
        else:
            per_bot.setdefault(str(row["bot_id"]), []).append(row)
    objects = {bot: {} for bot in per_bot}
    unassigned_objects = []
    for key, size in source.objects().items():
        folder = key.split("/", 1)[0]
        if folder in objects:
            objects[folder][key] = size
        else:
            unassigned_objects.append(key)
    snapshots = {}
    for bot, docs in per_bot.items():
        snapshot = inventory(docs, bot, source, objects[bot])
        snapshots[bot] = snapshot
        counts.update(e["status"] for e in snapshot["documents"])
        counts["orphan"] += len(snapshot["orphans"])
    counts["unassigned_document"] += sum(not row["deleted"] for row in unassigned)
    counts["unassigned_object"] += len(unassigned_objects)
    return dict(
        format=FORMAT,
        source_url=source.url,
        bucket=source.name,
        bots=snapshots,
        unassigned_documents=unassigned,
        unassigned_objects=sorted(unassigned_objects),
    )


def save_manifest(path, manifest):
    # Replace the prior complete snapshot only after the new one has been written.
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=path.parent, delete=False
    ) as fp:
        tmp = Path(fp.name)
        try:
            json.dump(manifest, fp, ensure_ascii=False, indent=2)
            fp.write("\n")
            fp.flush()
            os.fsync(fp.fileno())
        except BaseException:
            tmp.unlink(missing_ok=True)
            raise
    try:
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)


def load_manifest(path, bot, source):
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if "bots" in manifest:
        if (
            manifest["format"] != FORMAT
            or manifest["bucket"] != source.name
            or manifest["source_url"] != source.url
        ):
            raise ValueError("inventory does not match the configured MinIO")
        if bot not in manifest["bots"]:
            raise ValueError("Bot is absent from inventory")
        manifest = manifest["bots"][bot]
    if (
        manifest["format"],
        manifest["bot"],
        manifest["source_url"],
        manifest["bucket"],
    ) != (FORMAT, bot, source.url, source.name):
        raise ValueError("manifest does not match this Bot and MinIO bucket")
    seen = set()
    for entry in manifest["documents"]:
        doc = str(UUID(entry["id"]))
        if doc != entry["id"] or doc in seen:
            raise ValueError("invalid or repeated document ID")
        seen.add(doc)
        if entry["status"] == "ready" and (
            not DIGEST.fullmatch(entry["sha256"]) or not 0 <= entry["size"] <= MAX_BYTES
        ):
            raise ValueError("invalid inventory checksum or size")
    return manifest


async def publication(db, bot, doc):
    return (
        (
            await db.execute(
                text("""
        SELECT s.withdrawn,s.active_version,s.legacy_document_id,v.filename,v.raw_hash,v.text_hash,v.published_at
        FROM inbox_sources s LEFT JOIN inbox_source_versions v ON v.source_id=s.id AND v.version=1
        WHERE s.id=:id AND s.bot_id=:bot
    """),
                {"id": doc, "bot": bot},
            )
        )
        .mappings()
        .one_or_none()
    )


def matches(row, entry, bot):
    if row is None:
        return False
    current, status = classify(row, bot)
    return status == "ready" and all(
        current[k] == entry[k] for k in ("id", "name", "key")
    )


class Audit:
    def __init__(self):
        self.url = os.getenv("LOCAL_R2_AUDIT_URL")
        if self.url:
            url = urlsplit(self.url)
            if (
                url.scheme != "http"
                or url.hostname not in ("127.0.0.1", "localhost", "::1")
                or url.username
                or url.password
                or url.query
                or url.fragment
                or url.path.strip("/")
            ):
                raise ValueError("LOCAL_R2_AUDIT_URL must be a loopback origin")
            self.token = required("LOCAL_R2_AUDIT_TOKEN")
        else:
            self.bucket = Bucket("MIGRATION_R2")

    def digest(self, bot, doc, expected):
        path = f"{bot}/{doc}/1/{expected}"
        if self.url:
            response = httpx.get(
                self.url.rstrip("/") + "/internal/local-r2-digest/" + path,
                headers={"Authorization": "Bearer " + self.token},
                trust_env=False,
                timeout=30,
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()["sha256"]
        try:
            with self.bucket.open("sources/" + path) as response:
                digest = hashlib.sha256()
                for chunk in response.stream(256 * 1024):
                    digest.update(chunk)
                return digest.hexdigest()
        except S3Error as exc:
            if exc.code in MISSING:
                return None
            raise


def existing_status(pub, doc, entry):
    if (
        pub["legacy_document_id"] != doc
        or pub["raw_hash"] != entry["sha256"]
        or pub["filename"] != entry["name"]
    ):
        return "publication_conflict"
    if pub["withdrawn"]:
        return "withdrawn"
    return "published" if pub["published_at"] else "already_queued"


async def process(mode, sessions, bot, source, audit, entry, can_queue, report):
    if entry["status"] != "ready":
        return entry["status"]
    doc = UUID(entry["id"])
    params = {"bot": UUID(bot), "id": doc}
    lookup = f"SELECT {FIELDS} FROM knowledge_documents WHERE bot_id=:bot AND id=:id AND source_type='file'"
    async with sessions() as db:
        row = (await db.execute(text(lookup), params)).mappings().one_or_none()
        if not matches(row, entry, bot):
            return "catalog_changed"
        if mode == "apply":
            prior = await publication(db, params["bot"], doc)
            if prior:
                return existing_status(prior, doc, entry)
            if not can_queue:
                return "deferred"
    raw, status = source_bytes(source, entry)
    if raw is None:
        return status
    report.update(
        inventory_sha256=entry["sha256"], minio_sha256=hashlib.sha256(raw).hexdigest()
    )
    if len(raw) != entry["size"] or report["minio_sha256"] != entry["sha256"]:
        return "source_changed"
    async with sessions.begin() as db:
        row = (
            (
                await db.execute(
                    text(lookup + (" FOR UPDATE" if mode == "apply" else "")), params
                )
            )
            .mappings()
            .one_or_none()
        )
        if not matches(row, entry, bot):
            return "catalog_changed"
        pub = await publication(db, params["bot"], doc)
        if not pub:
            if mode == "verify":
                return "not_staged"
            await stage_version(db, params["bot"], doc, 0, entry["name"], raw)
            return "queued"
        status = existing_status(pub, doc, entry)
        if mode == "apply" or status in ("withdrawn", "publication_conflict"):
            return status
        if status == "already_queued":
            return "awaiting_worker"
    report.update(
        version=1,
        active_version=pub["active_version"],
        expected_text_sha256=pub["text_hash"],
    )
    for kind, digest in (("raw", pub["raw_hash"]), ("text", pub["text_hash"])):
        if kind == "text" and digest == pub["raw_hash"]:
            report["r2_text_sha256"] = report["r2_raw_sha256"]
            continue
        actual = audit.digest(bot, entry["id"], digest)
        report[f"r2_{kind}_sha256"] = actual
        if actual is None:
            return kind + "_missing"
        if actual != digest:
            return kind + "_hash_mismatch"
    return "verified" if pub["active_version"] == 1 else "verified_archived"


def emit(value):
    print(json.dumps(value, ensure_ascii=False), flush=True)


async def run(args):
    bot = str(args.bot) if args.bot else None
    source = Bucket("MIGRATION_MINIO")
    url = make_url(required("MIGRATION_DATABASE_URL"))
    if url.get_backend_name() not in ("postgres", "postgresql"):
        raise ValueError("PostgreSQL URL required")
    engine = create_async_engine(url.set(drivername="postgresql+asyncpg"))
    sessions = async_sessionmaker(engine)
    counts = Counter()
    try:
        rows = await documents(sessions, bot) if bot else []
        if args.all:
            save_manifest(args.manifest, await inventory_all(sessions, source, counts))
        elif args.mode == "inventory":
            manifest = inventory(rows, bot, source, source.objects(bot))
            save_manifest(args.manifest, manifest)
            for entry in manifest["documents"]:
                counts[entry["status"]] += 1
            counts["orphan"] += len(manifest["orphans"])
        else:
            manifest = load_manifest(args.manifest, bot, source)
            audit = Audit() if args.mode == "verify" else None
            active = {str(row["id"]) for row in rows if row["deleted_at"] is None}
            for entry in manifest["documents"]:
                report = {"id": entry["id"], "key": entry["key"]}
                try:
                    if entry["status"] == "deleted" and entry["id"] in active:
                        counts["catalog_changed"] += 1
                        emit(dict(report, status="catalog_changed"))
                        continue
                    status = await process(
                        args.mode,
                        sessions,
                        bot,
                        source,
                        audit,
                        entry,
                        args.limit is None or counts["queued"] < args.limit,
                        report,
                    )
                except HTTPException as exc:
                    status = {
                        409: "publication_conflict",
                        422: "unreadable",
                        413: "oversized",
                        415: "unsupported",
                    }.get(exc.status_code, "catalog_changed")
                except Exception as exc:
                    counts["error"] += 1
                    emit(dict(report, status="error", reason=type(exc).__name__))
                    continue
                counts[status] += 1
                emit(dict(report, status=status))
            # Account for objects and catalog rows which appeared since the snapshot.
            known = {entry["id"] for entry in manifest["documents"]}
            for row in rows:
                if str(row["id"]) not in known and row["deleted_at"] is None:
                    counts["new_document"] += 1
                    emit(dict(id=str(row["id"]), status="new_document"))
            for key in sorted(
                source.objects(bot).keys() - {r["object_path"] for r in rows}
            ):
                counts["orphan"] += 1
                emit(dict(key=key, status="orphan"))
        emit(dict(mode=args.mode, bot=bot, counts=dict(counts)))
        return (
            2 if any(n and status not in SUCCESS for status, n in counts.items()) else 0
        )
    finally:
        await engine.dispose()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["inventory", "apply", "verify"])
    scope = parser.add_mutually_exclusive_group(required=True)
    scope.add_argument("--bot", type=UUID)
    scope.add_argument(
        "--all",
        action="store_true",
        help="inventory all knowledge prefixes and unassigned originals",
    )
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument(
        "--limit",
        type=int,
        help="maximum number of new files to queue in this apply run",
    )
    args = parser.parse_args()
    if args.all and args.mode != "inventory":
        parser.error("--all is only available for inventory")
    if args.limit is not None and (args.mode != "apply" or args.limit < 1):
        parser.error("--limit requires apply and a positive number")
    try:
        return asyncio.run(run(args))
    except (ValueError, KeyError, FileNotFoundError) as exc:
        print(f"Migration configuration or manifest error: {exc}", file=sys.stderr)
    except Exception as exc:
        print(f"Migration failed: {type(exc).__name__}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
