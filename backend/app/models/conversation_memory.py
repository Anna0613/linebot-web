"""
Conversation memory index models.

MongoDB remains the source of truth for full LINE transcripts. This table is a
small searchable index used to retrieve older, semantically relevant turns when
building AI context.
"""
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.database import Base

try:
    from pgvector.sqlalchemy import Vector
except Exception:  # pragma: no cover
    Vector = None  # type: ignore


class ConversationMemoryEmbedding(Base):
    """Embedding index for LINE conversation messages."""

    __tablename__ = "conversation_memory_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    bot_id = Column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    line_user_id = Column(String(255), nullable=False)
    message_id = Column(String(64), nullable=False)
    sender_type = Column(String(32), nullable=False)
    message_type = Column(String(32), nullable=False, server_default="text")
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1536) if Vector else Text, nullable=True)
    embedding_model = Column(String(64), nullable=True, server_default="text-embedding-3-small")
    embedding_dimensions = Column(String(16), nullable=True, server_default="1536")
    message_timestamp = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("bot_id", "line_user_id", "message_id", name="uq_conversation_memory_message"),
        Index("idx_conversation_memory_lookup", "bot_id", "line_user_id", "message_timestamp"),
    )
