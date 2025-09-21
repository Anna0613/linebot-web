"""Add RAG params and history settings on bots

Revision ID: add_rag_params_history_20250921
Revises: add_ai_model_settings_20250921
Create Date: 2025-09-21
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_rag_params_history_20250921'
down_revision = 'add_ai_model_settings_20250921'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('bots', sa.Column('ai_rag_threshold', sa.Float(), nullable=True))
    op.add_column('bots', sa.Column('ai_rag_top_k', sa.Integer(), nullable=True))
    op.add_column('bots', sa.Column('ai_history_messages', sa.Integer(), nullable=True))


def downgrade():
    for col in ('ai_history_messages', 'ai_rag_top_k', 'ai_rag_threshold'):
        try:
            op.drop_column('bots', col)
        except Exception:
            pass

