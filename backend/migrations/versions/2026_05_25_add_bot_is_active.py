"""Add is_active to bots

Revision ID: add_bot_is_active_20260525
Revises: bot_pic_url_20260514
Create Date: 2026-05-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_bot_is_active_20260525"
down_revision: Union[str, None] = "bot_pic_url_20260514"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "bots",
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("bots", "is_active")
