"""optimize_hnsw_index

Revision ID: optimize_hnsw_20251026
Revises: 0017f6647d7f
Create Date: 2025-10-26 00:00:00.000000

優化 HNSW 索引參數以提升向量搜尋效能
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'optimize_hnsw_20251026'
down_revision: Union[str, None] = 'add_ai_summary_20251024'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """優化 HNSW 索引參數"""
    
    # 1. 刪除舊的 HNSW 索引
    try:
        op.execute("DROP INDEX IF EXISTS idx_knowledge_chunks_embedding_cosine;")
        print("已刪除舊的 HNSW 索引")
    except Exception as e:
        print(f"刪除舊索引失敗: {e}")
    
    # 2. 創建優化後的 HNSW 索引
    # 根據最佳實踐，對於 768 維向量:
    # - m: 32-48 (控制圖的連接度，越高查詢越快但索引越大)
    # - ef_construction: 128-200 (構建時的搜尋深度，越高索引質量越好但構建越慢)
    # - ef_search: 在查詢時動態設定
    try:
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw
            ON knowledge_chunks
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 32, ef_construction = 128);
        """)
        print("成功創建優化的 HNSW 向量索引 (m=32, ef_construction=128)")
    except Exception as e:
        print(f"創建優化索引失敗: {e}")
        # 如果失敗，嘗試使用較保守的參數
        try:
            op.execute("""
                CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw
                ON knowledge_chunks
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 24, ef_construction = 96);
            """)
            print("使用較保守參數創建 HNSW 索引 (m=24, ef_construction=96)")
        except Exception as e2:
            print(f"使用保守參數也失敗: {e2}")


def downgrade() -> None:
    """回退到舊的索引參數"""
    
    # 刪除優化的索引
    try:
        op.execute("DROP INDEX IF EXISTS idx_knowledge_chunks_embedding_hnsw;")
    except Exception as e:
        print(f"刪除優化索引失敗: {e}")
    
    # 恢復舊的索引
    try:
        op.execute("""
            CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_cosine
            ON knowledge_chunks
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64);
        """)
        print("已恢復舊的 HNSW 索引")
    except Exception as e:
        print(f"恢復舊索引失敗: {e}")

