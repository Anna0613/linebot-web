"""Store authenticated feedback from the support page."""

from pathlib import Path
from alembic import op

revision = "feedback_20261127"
down_revision = "inbox_delivery_20261127"
branch_labels = None
depends_on = None


def upgrade():
    op.execute((Path(__file__).resolve().parents[1] / "sql/20261127_feedback.sql").read_text())


def downgrade():
    op.drop_table("user_feedback")
