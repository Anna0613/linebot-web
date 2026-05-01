"""
MinIO endpoint diagnostic script.

Run from the repository root:
    backend/venv/bin/python backend/scripts/development/check_minio.py

Or from backend/:
    venv/bin/python scripts/development/check_minio.py
"""
from __future__ import annotations

import argparse
import os
import sys
from io import BytesIO
from pathlib import Path

from dotenv import load_dotenv
from minio import Minio


def _find_backend_dir() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "app").is_dir() and (parent / "env.example").is_file():
            return parent
    return current.parents[2]


def _load_env(backend_dir: Path) -> None:
    env_path = backend_dir / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()


def _read_object(client: Minio, bucket: str, object_path: str) -> bytes:
    response = client.get_object(bucket, object_path)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def main() -> int:
    backend_dir = _find_backend_dir()
    sys.path.insert(0, str(backend_dir))
    _load_env(backend_dir)

    parser = argparse.ArgumentParser(description="Check MinIO S3 endpoint connectivity.")
    parser.add_argument("--endpoint", default=os.getenv("MINIO_ENDPOINT"))
    parser.add_argument("--bucket", default=os.getenv("MINIO_BUCKET_NAME"))
    parser.add_argument("--region", default=os.getenv("MINIO_REGION", "us-east-1"))
    parser.add_argument("--secure", default=os.getenv("MINIO_SECURE", "false"))
    parser.add_argument("--access-key", default=os.getenv("MINIO_ACCESS_KEY"))
    parser.add_argument("--secret-key", default=os.getenv("MINIO_SECRET_KEY"))
    args = parser.parse_args()

    endpoint = args.endpoint or os.getenv("MINIO_ENDPOINT", "localhost:9000")
    bucket = args.bucket or os.getenv("MINIO_BUCKET_NAME", "message-store")
    region = args.region or os.getenv("MINIO_REGION", "us-east-1")
    secure = str(args.secure or os.getenv("MINIO_SECURE", "false")).lower() == "true"
    access_key = args.access_key or os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    secret_key = args.secret_key or os.getenv("MINIO_SECRET_KEY", "minioadmin")
    cert_check = os.getenv("MINIO_CERT_CHECK", "true").lower() == "true"

    print("MinIO diagnostic")
    print(f"  endpoint: {endpoint}")
    print(f"  secure:   {secure}")
    print(f"  region:   {region}")
    print(f"  bucket:   {bucket}")
    print(f"  cert:     {cert_check}")

    client = Minio(
        endpoint,
        access_key=access_key,
        secret_key=secret_key,
        secure=secure,
        region=region,
        cert_check=cert_check,
    )

    object_path = "diagnostics/codex-minio-check.txt"
    payload = b"codex-minio-check"

    try:
        exists = client.bucket_exists(bucket)
        print(f"bucket_exists: {exists}")
    except Exception as exc:
        print(f"bucket_exists failed: {type(exc).__name__}: {exc}")
        return 1

    try:
        client.put_object(
            bucket,
            object_path,
            BytesIO(payload),
            len(payload),
            content_type="text/plain",
        )
        print(f"put_object:    ok ({object_path})")
    except Exception as exc:
        print(f"put_object failed: {type(exc).__name__}: {exc}")
        return 1

    try:
        data = _read_object(client, bucket, object_path)
        print(f"get_object:    {len(data)} bytes")
        if data != payload:
            print("roundtrip:     failed (read bytes do not match written bytes)")
            return 1
        print("roundtrip:     ok")
    except Exception as exc:
        print(f"get_object failed: {type(exc).__name__}: {exc}")
        return 1
    finally:
        try:
            client.remove_object(bucket, object_path)
            print("cleanup:       ok")
        except Exception as exc:
            print(f"cleanup failed: {type(exc).__name__}: {exc}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
