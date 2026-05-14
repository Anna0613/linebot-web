"""Add conversation context memory index

Revision ID: ctx_memory_20260514
Revises: add_line_bot_identity_20260502
Create Date: 2026-05-14
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "ctx_memory_20260514"
down_revision: Union[str, None] = "add_line_bot_identity_20260502"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    op.execute(
        """
        UPDATE bots
        SET ai_history_messages = 12
        WHERE ai_history_messages IS NULL;
        """
    )
    op.execute("ALTER TABLE bots ALTER COLUMN ai_history_messages SET DEFAULT 12;")

    op.create_table(
        "conversation_memory_embeddings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("bot_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bots.id", ondelete="CASCADE"), nullable=False),
        sa.Column("line_user_id", sa.String(length=255), nullable=False),
        sa.Column("message_id", sa.String(length=64), nullable=False),
        sa.Column("sender_type", sa.String(length=32), nullable=False),
        sa.Column("message_type", sa.String(length=32), nullable=False, server_default="text"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding_model", sa.String(length=64), nullable=True, server_default="text-embedding-3-small"),
        sa.Column("embedding_dimensions", sa.String(length=16), nullable=True, server_default="1536"),
        sa.Column("message_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("bot_id", "line_user_id", "message_id", name="uq_conversation_memory_message"),
    )
    op.execute("ALTER TABLE conversation_memory_embeddings ADD COLUMN embedding vector(1536);")
    op.create_index(
        "idx_conversation_memory_lookup",
        "conversation_memory_embeddings",
        ["bot_id", "line_user_id", "message_timestamp"],
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_conversation_memory_embedding_hnsw
        ON conversation_memory_embeddings
        USING hnsw (embedding vector_cosine_ops)
        WHERE embedding IS NOT NULL;
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_conversation_memory_embedding_hnsw;")
    op.drop_index("idx_conversation_memory_lookup", table_name="conversation_memory_embeddings")
    op.drop_table("conversation_memory_embeddings")
    op.execute("ALTER TABLE bots ALTER COLUMN ai_history_messages DROP DEFAULT;")
