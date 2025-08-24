"""Add performance indexes for dashboard queries

Revision ID: perf_indexes_001
Revises: 7896f549eaa9
Create Date: 2025-08-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'perf_indexes_001'
down_revision: Union[str, None] = '7896f549eaa9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add performance indexes for dashboard optimization"""
    
    # 為 logic_templates 表添加複合索引（針對活躍邏輯查詢）
    op.create_index('idx_logic_template_bot_active_updated', 'logic_templates', 
                   ['bot_id', 'is_active', 'updated_at'], unique=False)
    
    # 為 line_bot_user_interactions 表添加分析專用索引
    # 針對時間範圍查詢優化
    op.create_index('idx_interaction_timestamp_desc', 'line_bot_user_interactions', 
                   [sa.text('timestamp DESC')], unique=False)
    
    # 添加 GIN 索引用於 JSONB 欄位查詢（如果有複雜查詢需求）
    op.create_index('idx_interaction_content_gin', 'line_bot_user_interactions',
                   ['message_content'], unique=False, postgresql_using='gin')
    
    # 針對 Bot 使用者統計的優化索引
    op.create_index('idx_line_user_bot_first_interaction', 'line_bot_users',
                   ['bot_id', 'first_interaction'], unique=False)
    
    # 針對最近活躍使用者查詢的優化索引
    op.create_index('idx_line_user_last_interaction_desc', 'line_bot_users',
                   [sa.text('last_interaction DESC')], unique=False)
    
    # 為 bots 表添加複合索引（用於使用者查詢）
    op.create_index('idx_bot_user_updated', 'bots',
                   ['user_id', 'updated_at'], unique=False)


def downgrade() -> None:
    """Remove performance indexes"""
    op.drop_index('idx_bot_user_updated', table_name='bots')
    op.drop_index('idx_line_user_last_interaction_desc', table_name='line_bot_users')
    op.drop_index('idx_line_user_bot_first_interaction', table_name='line_bot_users')
    op.drop_index('idx_interaction_content_gin', table_name='line_bot_user_interactions')
    op.drop_index('idx_interaction_timestamp_desc', table_name='line_bot_user_interactions')
    op.drop_index('idx_logic_template_bot_active_updated', table_name='logic_templates')