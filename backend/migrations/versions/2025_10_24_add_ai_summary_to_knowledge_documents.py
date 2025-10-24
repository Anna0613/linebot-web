"""Add ai_summary, original_content, and deleted_at columns to knowledge tables

Revision ID: add_ai_summary_20251024
Revises: 0017f6647d7f
Create Date: 2025-10-24
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_ai_summary_20251024'
down_revision = '0017f6647d7f'
branch_labels = None
depends_on = None


def upgrade():
    """新增 ai_summary、original_content 和 deleted_at 欄位"""

    # knowledge_documents 表新增欄位
    op.add_column(
        'knowledge_documents',
        sa.Column('ai_summary', sa.Text(), nullable=True)
    )
    op.add_column(
        'knowledge_documents',
        sa.Column('original_content', sa.Text(), nullable=True)
    )
    op.add_column(
        'knowledge_documents',
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True)
    )

    # knowledge_chunks 表新增 deleted_at 欄位
    op.add_column(
        'knowledge_chunks',
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True)
    )

    # 為 deleted_at 欄位建立索引（提升軟刪除查詢效能）
    op.create_index(
        'idx_kdocs_deleted_at',
        'knowledge_documents',
        ['deleted_at'],
        unique=False
    )
    op.create_index(
        'idx_kchunks_deleted_at',
        'knowledge_chunks',
        ['deleted_at'],
        unique=False
    )


def downgrade():
    """移除新增的欄位和索引"""

    # 移除索引
    op.drop_index('idx_kchunks_deleted_at', table_name='knowledge_chunks')
    op.drop_index('idx_kdocs_deleted_at', table_name='knowledge_documents')

    # 移除欄位
    op.drop_column('knowledge_chunks', 'deleted_at')
    op.drop_column('knowledge_documents', 'deleted_at')
    op.drop_column('knowledge_documents', 'original_content')
    op.drop_column('knowledge_documents', 'ai_summary')

