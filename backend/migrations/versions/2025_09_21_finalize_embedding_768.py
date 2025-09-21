"""Finalize embedding upgrade: single 768-d vector column

Revision ID: finalize_embedding_768_20250921
Revises: upgrade_embedding_model
Create Date: 2025-09-21
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'finalize_embedding_768_20250921'
down_revision = 'upgrade_embedding_model'
branch_labels = None
depends_on = None


def upgrade():
    # Drop vector indexes if they exist
    try:
        op.execute('DROP INDEX IF EXISTS idx_kchunks_embedding_hnsw')
    except Exception:
        pass
    try:
        op.execute('DROP INDEX IF EXISTS idx_kchunks_embedding_ivfflat')
    except Exception:
        pass

    # Remove staging/new columns
    try:
        op.execute('ALTER TABLE knowledge_chunks DROP COLUMN IF EXISTS embedding_new')
    except Exception:
        pass

    # Recreate embedding as 768-d vector
    # Some databases may already have vector(768). To be idempotent-ish, drop then add.
    try:
        op.execute('ALTER TABLE knowledge_chunks DROP COLUMN IF EXISTS embedding')
    except Exception:
        pass
    op.execute('ALTER TABLE knowledge_chunks ADD COLUMN embedding vector(768)')

    # Recreate ANN index on embedding
    try:
        op.execute('CREATE INDEX IF NOT EXISTS idx_kchunks_embedding_hnsw ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)')
    except Exception:
        # Fallback to ivfflat if hnsw not available
        op.execute("CREATE INDEX IF NOT EXISTS idx_kchunks_embedding_ivfflat ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)")


def downgrade():
    # On downgrade, revert to 384-d vector (legacy)
    try:
        op.execute('DROP INDEX IF EXISTS idx_kchunks_embedding_hnsw')
    except Exception:
        pass
    try:
        op.execute('DROP INDEX IF EXISTS idx_kchunks_embedding_ivfflat')
    except Exception:
        pass

    try:
        op.execute('ALTER TABLE knowledge_chunks DROP COLUMN IF EXISTS embedding')
    except Exception:
        pass
    op.execute('ALTER TABLE knowledge_chunks ADD COLUMN embedding vector(384)')

