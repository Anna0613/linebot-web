"""add admin messages and sender type

Revision ID: 4d5e6f7g8h9i
Revises: 3f8a9b2c1d5e
Create Date: 2025-08-28 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '4d5e6f7g8h9i'
down_revision = '3f8a9b2c1d5e'
branch_labels = None
depends_on = None


def upgrade():
    # 建立 admin_messages 表
    op.create_table('admin_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('bot_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('line_user_id', sa.String(length=255), nullable=False),
        sa.Column('admin_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('message_content', sa.Text(), nullable=False),
        sa.Column('message_type', sa.String(length=50), nullable=True),
        sa.Column('message_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('sent_status', sa.String(length=20), nullable=True),
        sa.Column('line_message_id', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['admin_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['bot_id'], ['bots.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 為 admin_messages 建立索引
    op.create_index('idx_admin_message_admin', 'admin_messages', ['admin_user_id'])
    op.create_index('idx_admin_message_bot_user', 'admin_messages', ['bot_id', 'line_user_id'])
    op.create_index('idx_admin_message_created', 'admin_messages', ['created_at'])
    op.create_index('idx_admin_message_status', 'admin_messages', ['sent_status'])
    
    # 為 line_bot_user_interactions 表新增欄位
    op.add_column('line_bot_user_interactions', sa.Column('sender_type', sa.String(length=20), nullable=True))
    op.add_column('line_bot_user_interactions', sa.Column('admin_user_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    # 為新欄位設定預設值
    op.execute("UPDATE line_bot_user_interactions SET sender_type = 'user' WHERE sender_type IS NULL")
    
    # 修改欄位為 NOT NULL（設定預設值後）
    op.alter_column('line_bot_user_interactions', 'sender_type', nullable=False, server_default='user')
    
    # 建立外鍵約束
    op.create_foreign_key(
        'fk_line_bot_user_interactions_admin_user_id', 
        'line_bot_user_interactions', 
        'users', 
        ['admin_user_id'], 
        ['id'], 
        ondelete='SET NULL'
    )
    
    # 為 line_bot_user_interactions 建立新索引
    op.create_index('idx_interaction_admin_user', 'line_bot_user_interactions', ['admin_user_id'])
    op.create_index('idx_interaction_sender_type', 'line_bot_user_interactions', ['sender_type'])
    op.create_index('idx_interaction_user_sender', 'line_bot_user_interactions', ['line_user_id', 'sender_type', 'timestamp'])


def downgrade():
    # 刪除新增的索引
    op.drop_index('idx_interaction_user_sender', table_name='line_bot_user_interactions')
    op.drop_index('idx_interaction_sender_type', table_name='line_bot_user_interactions')
    op.drop_index('idx_interaction_admin_user', table_name='line_bot_user_interactions')
    
    # 刪除外鍵約束
    op.drop_constraint('fk_line_bot_user_interactions_admin_user_id', 'line_bot_user_interactions', type_='foreignkey')
    
    # 刪除新增的欄位
    op.drop_column('line_bot_user_interactions', 'admin_user_id')
    op.drop_column('line_bot_user_interactions', 'sender_type')
    
    # 刪除 admin_messages 表的索引
    op.drop_index('idx_admin_message_status', table_name='admin_messages')
    op.drop_index('idx_admin_message_created', table_name='admin_messages')
    op.drop_index('idx_admin_message_bot_user', table_name='admin_messages')
    op.drop_index('idx_admin_message_admin', table_name='admin_messages')
    
    # 刪除 admin_messages 表
    op.drop_table('admin_messages')