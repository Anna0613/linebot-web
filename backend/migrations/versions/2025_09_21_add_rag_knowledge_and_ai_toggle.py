"""Add knowledge base tables and AI toggle

Revision ID: rag_knowledge_ai_toggle_20250921
Revises: c095bfe6de6b
Create Date: 2025-09-21
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'rag_knowledge_ai_toggle_20250921'
down_revision = 'c095bfe6de6b'
branch_labels = None
depends_on = None


def upgrade():
    # ai_takeover_enabled on bots
    op.add_column('bots', sa.Column('ai_takeover_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')))

    # knowledge_documents table
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS knowledge_documents (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            bot_id UUID NULL REFERENCES bots(id) ON DELETE SET NULL,
            source_type VARCHAR(32) NOT NULL,
            title VARCHAR(255),
            original_file_name VARCHAR(255),
            object_path VARCHAR(512),
            chunked BOOLEAN NOT NULL DEFAULT true,
            meta JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    op.create_index('idx_kdocs_bot_created', 'knowledge_documents', ['bot_id', 'created_at'], unique=False)

    # knowledge_chunks table with vector embedding
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS knowledge_chunks (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
            bot_id UUID NULL REFERENCES bots(id) ON DELETE SET NULL,
            content TEXT NOT NULL,
            embedding vector(384),
            meta JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    op.create_index('idx_kchunks_bot_created', 'knowledge_chunks', ['bot_id', 'created_at'], unique=False)

    # HNSW index (if pgvector >= 0.5)
    try:
        op.execute("CREATE INDEX IF NOT EXISTS idx_kchunks_embedding_hnsw ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)")
    except Exception:
        # fallback to ivfflat index
        op.execute("CREATE INDEX IF NOT EXISTS idx_kchunks_embedding_ivfflat ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)")


def downgrade():
    try:
        op.drop_index('idx_kchunks_embedding_hnsw', table_name='knowledge_chunks')
    except Exception:
        try:
            op.drop_index('idx_kchunks_embedding_ivfflat', table_name='knowledge_chunks')
        except Exception:
            pass
    op.drop_index('idx_kchunks_bot_created', table_name='knowledge_chunks')
    op.execute('DROP TABLE IF EXISTS knowledge_chunks')
    op.drop_index('idx_kdocs_bot_created', table_name='knowledge_documents')
    op.execute('DROP TABLE IF EXISTS knowledge_documents')
    try:
        op.drop_column('bots', 'ai_takeover_enabled')
    except Exception:
        pass

