"""Queue human replies in the conversation transaction."""

from pathlib import Path
from alembic import op

revision = "inbox_delivery_20261127"
down_revision = "inbox_sources_20261127"
branch_labels = None
depends_on = None


def upgrade():
    path = Path(__file__).resolve().parents[1] / "sql/20261127_inbox_delivery.sql"
    for statement in path.read_text().split("-- next statement"):
        op.execute(statement.strip())


def downgrade():
    op.drop_column("inbox_messages", "campaign_id")
    op.drop_table("inbox_campaigns")
    for column in ("dispatch_after", "dispatch_key", "client_key", "delivery_state"):
        op.drop_column("inbox_messages", column)
