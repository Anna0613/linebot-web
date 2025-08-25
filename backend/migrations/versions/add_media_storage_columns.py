"""
Add media storage columns to line_bot_user_interactions

Revision ID: add_media_storage_columns
Revises: perf_indexes_001
Create Date: 2025-08-25 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_media_storage_columns'
down_revision = 'add_line_bot_users'
branch_labels = None
depends_on = None

def upgrade():
    """添加媒體儲存相關欄位"""
    
    # 為 line_bot_user_interactions 表添加媒體路徑欄位
    op.add_column('line_bot_user_interactions', 
                  sa.Column('media_path', sa.String(500), nullable=True,
                          comment='MinIO 媒體檔案路徑'))
    
    op.add_column('line_bot_user_interactions', 
                  sa.Column('media_url', sa.String(500), nullable=True,
                          comment='媒體檔案公開訪問 URL'))
    
    # 為媒體路徑添加索引，加速媒體檔案查詢
    op.create_index('idx_interaction_media_path', 'line_bot_user_interactions', 
                    ['media_path'], postgresql_where=sa.text('media_path IS NOT NULL'))

def downgrade():
    """移除媒體儲存相關欄位"""
    
    # 刪除索引
    op.drop_index('idx_interaction_media_path', table_name='line_bot_user_interactions')
    
    # 刪除欄位
    op.drop_column('line_bot_user_interactions', 'media_url')
    op.drop_column('line_bot_user_interactions', 'media_path')