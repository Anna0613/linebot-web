"""Add design_blocks column to flex_messages

Revision ID: add_design_blocks_001
Revises: merge_heads_2025
Create Date: 2025-09-07 00:01:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_design_blocks_001'
down_revision = 'merge_heads_2025'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('flex_messages', sa.Column('design_blocks', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade():
    op.drop_column('flex_messages', 'design_blocks')

