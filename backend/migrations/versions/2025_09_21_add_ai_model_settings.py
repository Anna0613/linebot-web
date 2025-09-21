"""Add AI model settings to bots

Revision ID: add_ai_model_settings_20250921
Revises: rag_knowledge_ai_toggle_20250921
Create Date: 2025-09-21
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_ai_model_settings_20250921'
down_revision = 'rag_knowledge_ai_toggle_20250921'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('bots', sa.Column('ai_model_provider', sa.String(length=50), nullable=True, server_default=sa.text("'groq'")))
    op.add_column('bots', sa.Column('ai_model', sa.String(length=255), nullable=True))


def downgrade():
    try:
        op.drop_column('bots', 'ai_model')
    except Exception:
        pass
    try:
        op.drop_column('bots', 'ai_model_provider')
    except Exception:
        pass

