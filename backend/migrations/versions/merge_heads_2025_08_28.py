"""Merge heads: admin messages, line bot users, and performance indexes

Revision ID: merge_heads_2025
Revises: 4d5e6f7g8h9i, add_line_bot_users, perf_indexes_001
Create Date: 2025-08-28 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_heads_2025'
down_revision = ('4d5e6f7g8h9i', 'add_line_bot_users', 'perf_indexes_001')
branch_labels = None
depends_on = None


def upgrade():
    """Merge migration - no changes needed as all heads are compatible"""
    pass


def downgrade():
    """Merge migration - no downgrade needed"""
    pass