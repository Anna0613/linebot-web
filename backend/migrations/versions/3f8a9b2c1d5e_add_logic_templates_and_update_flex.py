"""Add logic templates and update flex messages

Revision ID: 3f8a9b2c1d5e
Revises: 7896f549eaa9
Create Date: 2025-07-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '3f8a9b2c1d5e'
down_revision = '7896f549eaa9'
branch_labels = None
depends_on = None


def upgrade():
    """升級資料庫架構"""
    
    # 創建 logic_templates 表
    op.create_table('logic_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('bot_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('logic_blocks', postgresql.JSONB(astext_type=sa.Text()), nullable=False, default='[]'),
        sa.Column('is_active', sa.String(length=10), nullable=False, default='false'),
        sa.Column('generated_code', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['bot_id'], ['bots.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('bot_id', 'name', name='unique_logic_template_name_per_bot')
    )
    
    # 為 logic_templates 表創建索引
    op.create_index('idx_logic_template_user_created', 'logic_templates', ['user_id', 'created_at'])
    op.create_index('idx_logic_template_bot_active', 'logic_templates', ['bot_id', 'is_active'])
    
    # 為 flex_messages 表添加 name 欄位
    op.add_column('flex_messages', sa.Column('name', sa.String(length=255), nullable=False, server_default='Untitled Message'))
    
    # 為 flex_messages 表添加唯一約束（用戶不能有同名的 Flex 訊息）
    op.create_unique_constraint('unique_flex_message_name_per_user', 'flex_messages', ['user_id', 'name'])


def downgrade():
    """降級資料庫架構"""
    
    # 移除 flex_messages 的唯一約束
    op.drop_constraint('unique_flex_message_name_per_user', 'flex_messages', type_='unique')
    
    # 移除 flex_messages 的 name 欄位
    op.drop_column('flex_messages', 'name')
    
    # 移除 logic_templates 的索引
    op.drop_index('idx_logic_template_bot_active', 'logic_templates')
    op.drop_index('idx_logic_template_user_created', 'logic_templates')
    
    # 刪除 logic_templates 表
    op.drop_table('logic_templates')