#!/usr/bin/env python3
"""
Backfill knowledge chunk embeddings with OpenAI text-embedding-3-small.

The script is resumable: it only processes chunks whose embedding is missing or
whose model/dimension metadata does not match the OpenAI 1536-d target.
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path
from typing import List

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import func, or_, select, update

from app.config import settings
from app.db.database_async import AsyncSessionLocal
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.services.embedding.embedding_service import embed_texts


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Backfill OpenAI 1536-d embeddings for knowledge_chunks"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=settings.EMBEDDING_BATCH_SIZE,
        help="Number of chunks to embed per OpenAI request batch",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Maximum chunks to process in this run; 0 means no limit",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.0,
        help="Seconds to sleep between batches",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print pending counts without writing embeddings",
    )
    return parser.parse_args()


async def fetch_batch(batch_size: int) -> List[KnowledgeChunk]:
    async with AsyncSessionLocal() as db:
        stmt = (
            select(KnowledgeChunk)
            .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
            .where(
                KnowledgeChunk.deleted_at.is_(None),
                KnowledgeDocument.deleted_at.is_(None),
                KnowledgeChunk.content.isnot(None),
                KnowledgeChunk.content != "",
                or_(
                    KnowledgeChunk.embedding.is_(None),
                    KnowledgeChunk.embedding_model != settings.EMBEDDING_MODEL,
                    KnowledgeChunk.embedding_dimensions != str(settings.EMBEDDING_DIMENSIONS),
                ),
            )
            .order_by(KnowledgeChunk.created_at.asc())
            .limit(batch_size)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())


async def pending_count() -> int:
    async with AsyncSessionLocal() as db:
        stmt = (
            select(func.count(KnowledgeChunk.id))
            .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
            .where(
                KnowledgeChunk.deleted_at.is_(None),
                KnowledgeDocument.deleted_at.is_(None),
                KnowledgeChunk.content.isnot(None),
                KnowledgeChunk.content != "",
                or_(
                    KnowledgeChunk.embedding.is_(None),
                    KnowledgeChunk.embedding_model != settings.EMBEDDING_MODEL,
                    KnowledgeChunk.embedding_dimensions != str(settings.EMBEDDING_DIMENSIONS),
                ),
            )
        )
        result = await db.execute(stmt)
        return int(result.scalar() or 0)


async def update_batch(chunks: List[KnowledgeChunk], embeddings: List[List[float]]) -> None:
    async with AsyncSessionLocal() as db:
        for chunk, embedding in zip(chunks, embeddings):
            if len(embedding) != settings.EMBEDDING_DIMENSIONS:
                raise ValueError(
                    f"Chunk {chunk.id} returned {len(embedding)} dimensions; "
                    f"expected {settings.EMBEDDING_DIMENSIONS}"
                )
            await db.execute(
                update(KnowledgeChunk)
                .where(KnowledgeChunk.id == chunk.id)
                .values(
                    embedding=embedding,
                    embedding_model=settings.EMBEDDING_MODEL,
                    embedding_dimensions=str(settings.EMBEDDING_DIMENSIONS),
                    updated_at=func.now(),
                )
            )
        await db.commit()


async def run_backfill(args: argparse.Namespace) -> None:
    if settings.EMBEDDING_PROVIDER != "openai":
        raise RuntimeError("EMBEDDING_PROVIDER must be openai for this backfill")

    total_pending = await pending_count()
    logger.info(
        "OpenAI embedding backfill target: model=%s dimensions=%s pending=%s",
        settings.EMBEDDING_MODEL,
        settings.EMBEDDING_DIMENSIONS,
        total_pending,
    )

    if args.dry_run:
        return

    processed = 0
    failed_ids: List[str] = []

    while True:
        if args.limit and processed >= args.limit:
            break

        remaining_limit = args.limit - processed if args.limit else args.batch_size
        batch_size = min(args.batch_size, remaining_limit) if args.limit else args.batch_size
        chunks = await fetch_batch(batch_size)
        if not chunks:
            break

        texts = [chunk.content for chunk in chunks]
        try:
            embeddings = await embed_texts(
                texts,
                model_name=settings.EMBEDDING_MODEL,
                batch_size=args.batch_size,
                adaptive=False,
            )
            await update_batch(chunks, embeddings)
            processed += len(chunks)
            logger.info("Backfilled %s chunks so far", processed)

        except Exception as exc:
            failed_ids.extend(str(chunk.id) for chunk in chunks)
            logger.error(
                "Backfill batch failed for chunk ids %s: %s",
                [str(chunk.id) for chunk in chunks],
                exc,
            )
            raise

        if args.sleep > 0:
            await asyncio.sleep(args.sleep)

    logger.info("Backfill complete: processed=%s failed=%s", processed, len(failed_ids))
    if failed_ids:
        logger.error("Failed chunk ids: %s", failed_ids)


async def main() -> None:
    args = parse_args()
    await run_backfill(args)


if __name__ == "__main__":
    asyncio.run(main())
