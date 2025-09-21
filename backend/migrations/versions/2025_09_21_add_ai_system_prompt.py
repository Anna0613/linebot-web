"""Add AI system prompt per bot

Revision ID: add_ai_system_prompt_20250921
Revises: add_rag_params_history_20250921
Create Date: 2025-09-21
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_ai_system_prompt_20250921'
down_revision = 'add_rag_params_history_20250921'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('bots', sa.Column('ai_system_prompt', sa.Text(), nullable=True))


def downgrade():
    try:
        op.drop_column('bots', 'ai_system_prompt')
    except Exception:
        pass

