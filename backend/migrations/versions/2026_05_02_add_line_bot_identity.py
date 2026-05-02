"""Add LINE bot identity for duplicate registration checks

Revision ID: add_line_bot_identity_20260502
Revises: openai_embedding_1536_20260501
Create Date: 2026-05-02
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_line_bot_identity_20260502"
down_revision: Union[str, None] = "openai_embedding_1536_20260501"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("bots", sa.Column("line_bot_user_id", sa.String(length=255), nullable=True))
    op.add_column("bots", sa.Column("line_bot_basic_id", sa.String(length=255), nullable=True))
    op.add_column("bots", sa.Column("line_bot_display_name", sa.String(length=255), nullable=True))
    op.create_index("idx_bot_line_bot_user_id", "bots", ["line_bot_user_id"], unique=True)


def downgrade() -> None:
    op.drop_index("idx_bot_line_bot_user_id", table_name="bots")
    op.drop_column("bots", "line_bot_display_name")
    op.drop_column("bots", "line_bot_basic_id")
    op.drop_column("bots", "line_bot_user_id")
