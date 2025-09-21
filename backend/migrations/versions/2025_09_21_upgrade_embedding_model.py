"""升級嵌入模型到 all-mpnet-base-v2

Revision ID: upgrade_embedding_model
Revises: add_rag_params_history_20250921
Create Date: 2025-09-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'upgrade_embedding_model'
down_revision = 'add_ai_system_prompt_20250921'
branch_labels = None
depends_on = None


def upgrade():
    """升級到新的嵌入模型"""
    
    # 1. 添加新的欄位來儲存嵌入模型資訊
    op.add_column('knowledge_chunks', sa.Column('embedding_model', sa.String(64), nullable=True, server_default='all-mpnet-base-v2'))
    op.add_column('knowledge_chunks', sa.Column('embedding_dimensions', sa.String(16), nullable=True, server_default='768'))
    
    # 2. 更新現有記錄的模型資訊
    op.execute("""
        UPDATE knowledge_chunks 
        SET embedding_model = 'all-MiniLM-L6-v2', 
            embedding_dimensions = '384' 
        WHERE embedding_model IS NULL
    """)
    
    # 3. 創建新的 768 維度嵌入欄位
    # 注意：我們保留舊的 384 維度欄位以便回滾
    op.add_column('knowledge_chunks', sa.Column('embedding_new', postgresql.ARRAY(sa.Float), nullable=True))
    
    # 4. 添加索引以提升查詢效能
    op.create_index('idx_kchunks_embedding_model', 'knowledge_chunks', ['embedding_model'])
    op.create_index('idx_kchunks_dimensions', 'knowledge_chunks', ['embedding_dimensions'])
    
    # 5. 添加註釋說明遷移狀態
    op.execute("""
        COMMENT ON COLUMN knowledge_chunks.embedding IS '舊的 384 維度嵌入（all-MiniLM-L6-v2）';
    """)
    op.execute("""
        COMMENT ON COLUMN knowledge_chunks.embedding_new IS '新的 768 維度嵌入（all-mpnet-base-v2）';
    """)
    
    print("✅ 嵌入模型升級遷移完成")
    print("📝 注意事項：")
    print("   1. 舊的 384 維度嵌入保留在 'embedding' 欄位")
    print("   2. 新的 768 維度嵌入將儲存在 'embedding_new' 欄位")
    print("   3. 需要執行重新嵌入腳本來生成新的向量")
    print("   4. 完成後可以選擇性地刪除舊的嵌入欄位")


def downgrade():
    """回滾嵌入模型升級"""
    
    # 移除新增的欄位和索引
    op.drop_index('idx_kchunks_dimensions', table_name='knowledge_chunks')
    op.drop_index('idx_kchunks_embedding_model', table_name='knowledge_chunks')
    op.drop_column('knowledge_chunks', 'embedding_new')
    op.drop_column('knowledge_chunks', 'embedding_dimensions')
    op.drop_column('knowledge_chunks', 'embedding_model')
    
    print("⚠️  嵌入模型升級已回滾")
    print("📝 注意：原有的 384 維度嵌入已恢復")
