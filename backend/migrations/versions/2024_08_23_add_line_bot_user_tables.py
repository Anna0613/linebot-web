"""Add LINE Bot user and interaction tables

Revision ID: add_line_bot_users
Revises: 3f8a9b2c1d5e
Create Date: 2024-08-23 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'add_line_bot_users'
down_revision = '3f8a9b2c1d5e'
branch_labels = None
depends_on = None

def upgrade():
    """Create LINE Bot user related tables"""
    
    # Create line_bot_users table
    op.create_table('line_bot_users',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('bot_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('line_user_id', sa.String(255), nullable=False),
        sa.Column('display_name', sa.String(255), nullable=True),
        sa.Column('picture_url', sa.Text(), nullable=True),
        sa.Column('status_message', sa.Text(), nullable=True),
        sa.Column('language', sa.String(10), nullable=True),
        sa.Column('is_followed', sa.Boolean(), default=True, nullable=True),
        sa.Column('first_interaction', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('last_interaction', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('interaction_count', sa.String(50), default='1', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['bot_id'], ['bots.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for line_bot_users
    op.create_index('idx_line_user_bot_line_id', 'line_bot_users', ['bot_id', 'line_user_id'], unique=True)
    op.create_index('idx_line_user_last_interaction', 'line_bot_users', ['last_interaction'])
    op.create_index('idx_line_user_followed', 'line_bot_users', ['is_followed'])
    
    # Create line_bot_user_interactions table
    op.create_table('line_bot_user_interactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('line_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('message_type', sa.String(50), nullable=True),
        sa.Column('message_content', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['line_user_id'], ['line_bot_users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for line_bot_user_interactions
    op.create_index('idx_interaction_user_timestamp', 'line_bot_user_interactions', ['line_user_id', 'timestamp'])
    op.create_index('idx_interaction_event_type', 'line_bot_user_interactions', ['event_type'])
    op.create_index('idx_interaction_timestamp', 'line_bot_user_interactions', ['timestamp'])
    
    # Create rich_menus table
    op.create_table('rich_menus',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('bot_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('line_rich_menu_id', sa.String(255), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('chat_bar_text', sa.String(14), nullable=False),
        sa.Column('selected', sa.Boolean(), default=False, nullable=True),
        sa.Column('size', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('areas', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['bot_id'], ['bots.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for rich_menus
    op.create_index('idx_rich_menu_bot_id', 'rich_menus', ['bot_id'])
    op.create_index('idx_rich_menu_selected', 'rich_menus', ['bot_id', 'selected'])

def downgrade():
    """Drop LINE Bot user related tables"""
    
    # Drop indexes and tables in reverse order
    op.drop_index('idx_rich_menu_selected', table_name='rich_menus')
    op.drop_index('idx_rich_menu_bot_id', table_name='rich_menus')
    op.drop_table('rich_menus')
    
    op.drop_index('idx_interaction_timestamp', table_name='line_bot_user_interactions')
    op.drop_index('idx_interaction_event_type', table_name='line_bot_user_interactions')
    op.drop_index('idx_interaction_user_timestamp', table_name='line_bot_user_interactions')
    op.drop_table('line_bot_user_interactions')
    
    op.drop_index('idx_line_user_followed', table_name='line_bot_users')
    op.drop_index('idx_line_user_last_interaction', table_name='line_bot_users')
    op.drop_index('idx_line_user_bot_line_id', table_name='line_bot_users')
    op.drop_table('line_bot_users')