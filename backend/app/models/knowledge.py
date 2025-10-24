"""
Knowledge base models for RAG
"""
from sqlalchemy import (
    Column,
    String,
    Text,
    ForeignKey,
    DateTime,
    Index,
    UniqueConstraint,
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base

try:
    # Requires package: pgvector
    from pgvector.sqlalchemy import Vector
except Exception:  # pragma: no cover
    Vector = None  # type: ignore


class KnowledgeDocument(Base):
    """Represents a source unit (text input or uploaded file)."""

    __tablename__ = "knowledge_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    # bot scope; null means global shared
    bot_id = Column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="SET NULL"), nullable=True)
    source_type = Column(String(32), nullable=False)  # text | file | bulk
    title = Column(String(255), nullable=True)
    original_file_name = Column(String(255), nullable=True)
    object_path = Column(String(512), nullable=True)  # MinIO object path when file
    chunked = Column(Boolean, nullable=False, server_default="true")
    # AI 生成的文件摘要（用於意圖判斷優化）
    ai_summary = Column(Text, nullable=True)
    # 檔案原文內容（用於重新生成摘要或其他用途）
    original_content = Column(Text, nullable=True)
    meta = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    # 軟刪除時間戳記
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_kdocs_bot_created", "bot_id", "created_at"),
    )


class KnowledgeChunk(Base):
    """Chunk of text with embedding."""

    __tablename__ = "knowledge_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    document_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False)
    # duplicate bot_id for simpler filtering and to join without document table
    bot_id = Column(UUID(as_uuid=True), ForeignKey("bots.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text, nullable=False)
    # 768-dim embedding using pgvector (升級到 all-mpnet-base-v2)
    # 注意：這需要資料庫遷移來更新現有資料
    embedding = Column(Vector(768) if Vector else Text, nullable=True)  # fallback type if pgvector missing
    # 儲存嵌入模型資訊
    embedding_model = Column(String(64), nullable=True, server_default="all-mpnet-base-v2")
    embedding_dimensions = Column(String(16), nullable=True, server_default="768")
    meta = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    # 軟刪除時間戳記
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    document = relationship("KnowledgeDocument", back_populates="chunks")

    __table_args__ = (
        Index("idx_kchunks_bot_created", "bot_id", "created_at"),
    )

