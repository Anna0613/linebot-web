#!/usr/bin/env python3
"""
Deprecated embedding migration entrypoint.

Use backfill_openai_embeddings_1536.py for the OpenAI text-embedding-3-small
migration.
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from scripts.migration.backfill_openai_embeddings_1536 import main


if __name__ == "__main__":
    asyncio.run(main())
