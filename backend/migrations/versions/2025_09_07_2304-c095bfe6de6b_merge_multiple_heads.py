"""merge multiple heads

Revision ID: c095bfe6de6b
Revises: f6797e183ef3, add_design_blocks_001
Create Date: 2025-09-07 23:04:22.597372

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c095bfe6de6b'
down_revision: Union[str, None] = ('f6797e183ef3', 'add_design_blocks_001')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
