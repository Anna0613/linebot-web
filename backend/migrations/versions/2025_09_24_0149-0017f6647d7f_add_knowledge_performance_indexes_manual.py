"""add_knowledge_performance_indexes_manual

Revision ID: 0017f6647d7f
Revises: finalize_embedding_768_20250921
Create Date: 2025-09-24 01:49:23.229379

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0017f6647d7f'
down_revision: Union[str, None] = 'finalize_embedding_768_20250921'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """添加知識庫效能優化索引"""

    # 1. 為 knowledge_documents 表添加複合索引（如果不存在）
    try:
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_documents_bot_created
            ON knowledge_documents (bot_id, created_at);
        """)
    except Exception as e:
        print(f"創建 knowledge_documents 複合索引失敗: {e}")

    try:
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source_type
            ON knowledge_documents (source_type);
        """)
    except Exception as e:
        print(f"創建 knowledge_documents source_type 索引失敗: {e}")

    # 2. 為 knowledge_chunks 表添加效能索引（如果不存在）
    try:
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_bot_created
            ON knowledge_chunks (bot_id, created_at);
        """)
    except Exception as e:
        print(f"創建 knowledge_chunks 複合索引失敗: {e}")

    try:
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id
            ON knowledge_chunks (document_id);
        """)
    except Exception as e:
        print(f"創建 knowledge_chunks document_id 索引失敗: {e}")

    # 3. 為批次操作優化的索引（如果不存在）
    try:
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_batch_ops
            ON knowledge_chunks (bot_id, document_id, created_at);
        """)
    except Exception as e:
        print(f"創建 knowledge_chunks 批次操作索引失敗: {e}")

    # 4. 為統計查詢優化的索引（如果不存在）
    try:
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_documents_stats
            ON knowledge_documents (bot_id, source_type, chunked);
        """)
    except Exception as e:
        print(f"創建 knowledge_documents 統計索引失敗: {e}")

    # 5. 嘗試創建向量搜尋索引（如果 pgvector 可用）
    try:
        # 檢查是否有 pgvector 擴展
        op.execute("SELECT 1 FROM pg_extension WHERE extname = 'vector';")

        # 創建 HNSW 索引用於向量相似度搜尋
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_cosine
            ON knowledge_chunks
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64);
        """)
        print("成功創建 HNSW 向量索引")

    except Exception as e:
        print(f"向量索引創建失敗（可能是因為 pgvector 未安裝或向量欄位不存在）: {e}")

    # 6. 嘗試創建全文搜尋索引
    try:
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_content_gin
            ON knowledge_chunks
            USING gin(to_tsvector('english', content));
        """)
        print("成功創建全文搜尋索引")
    except Exception as e:
        print(f"全文搜尋索引創建失敗: {e}")


def downgrade() -> None:
    """移除效能優化索引"""

    # 移除複合索引
    op.execute("DROP INDEX IF EXISTS idx_knowledge_documents_bot_created;")
    op.execute("DROP INDEX IF EXISTS idx_knowledge_documents_source_type;")
    op.execute("DROP INDEX IF EXISTS idx_knowledge_chunks_bot_created;")
    op.execute("DROP INDEX IF EXISTS idx_knowledge_chunks_document_id;")
    op.execute("DROP INDEX IF EXISTS idx_knowledge_chunks_batch_ops;")
    op.execute("DROP INDEX IF EXISTS idx_knowledge_documents_stats;")

    # 移除向量索引
    try:
        op.execute("DROP INDEX IF EXISTS idx_knowledge_chunks_embedding_cosine;")
    except Exception as e:
        print(f"向量索引移除失敗: {e}")

    # 移除全文搜尋索引
    try:
        op.execute("DROP INDEX IF EXISTS idx_knowledge_chunks_content_gin;")
    except Exception as e:
        print(f"全文搜尋索引移除失敗: {e}")
