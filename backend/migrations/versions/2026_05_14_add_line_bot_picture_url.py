"""Add line_bot_picture_url to bots for MinIO avatar caching

Revision ID: add_line_bot_picture_url_20260514
Revises: ctx_memory_20260514
Create Date: 2026-05-14
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "bot_pic_url_20260514"
down_revision: Union[str, None] = "ctx_memory_20260514"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "bots",
        sa.Column("line_bot_picture_url", sa.String(length=1000), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("bots", "line_bot_picture_url")
