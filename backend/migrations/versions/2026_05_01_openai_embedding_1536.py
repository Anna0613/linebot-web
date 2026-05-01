"""migrate knowledge embeddings to OpenAI 1536 dimensions

Revision ID: openai_embedding_1536_20260501
Revises: optimize_hnsw_20251026
Create Date: 2026-05-01
"""
from typing import Sequence, Union

from alembic import op


revision: str = "openai_embedding_1536_20260501"
down_revision: Union[str, None] = "optimize_hnsw_20251026"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop known vector index names before replacing vector dimensions.
    op.execute("DROP INDEX IF EXISTS idx_knowledge_chunks_embedding_hnsw;")
    op.execute("DROP INDEX IF EXISTS idx_knowledge_chunks_embedding_cosine;")
    op.execute("DROP INDEX IF EXISTS idx_kchunks_embedding_hnsw;")
    op.execute("DROP INDEX IF EXISTS idx_kchunks_embedding_ivfflat;")

    op.execute("""
        ALTER TABLE knowledge_chunks
        ADD COLUMN IF NOT EXISTS embedding_model varchar(64);
    """)
    op.execute("""
        ALTER TABLE knowledge_chunks
        ADD COLUMN IF NOT EXISTS embedding_dimensions varchar(16);
    """)

    # Old local/Gemini vectors must not be mixed with OpenAI embeddings.
    op.execute("ALTER TABLE knowledge_chunks DROP COLUMN IF EXISTS embedding;")
    op.execute("ALTER TABLE knowledge_chunks ADD COLUMN embedding vector(1536);")

    op.execute("""
        ALTER TABLE knowledge_chunks
        ALTER COLUMN embedding_model SET DEFAULT 'text-embedding-3-small';
    """)
    op.execute("""
        ALTER TABLE knowledge_chunks
        ALTER COLUMN embedding_dimensions SET DEFAULT '1536';
    """)
    op.execute("""
        UPDATE knowledge_chunks
        SET embedding_model = 'text-embedding-3-small',
            embedding_dimensions = '1536',
            updated_at = NOW();
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_kchunks_embedding_model
        ON knowledge_chunks (embedding_model);
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_kchunks_dimensions
        ON knowledge_chunks (embedding_dimensions);
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw
        ON knowledge_chunks
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 32, ef_construction = 128);
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_knowledge_chunks_embedding_hnsw;")
    op.execute("DROP INDEX IF EXISTS idx_kchunks_embedding_ivfflat;")

    op.execute("ALTER TABLE knowledge_chunks DROP COLUMN IF EXISTS embedding;")
    op.execute("ALTER TABLE knowledge_chunks ADD COLUMN embedding vector(768);")

    op.execute("""
        ALTER TABLE knowledge_chunks
        ALTER COLUMN embedding_model SET DEFAULT 'all-mpnet-base-v2';
    """)
    op.execute("""
        ALTER TABLE knowledge_chunks
        ALTER COLUMN embedding_dimensions SET DEFAULT '768';
    """)
    op.execute("""
        UPDATE knowledge_chunks
        SET embedding_model = 'all-mpnet-base-v2',
            embedding_dimensions = '768',
            updated_at = NOW();
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_kchunks_embedding_hnsw
        ON knowledge_chunks
        USING hnsw (embedding vector_cosine_ops);
    """)
