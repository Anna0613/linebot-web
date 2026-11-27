"""Add PostgreSQL inbox tables for the opt-in Worker ingestion path."""
from pathlib import Path

from alembic import op

revision = "inbox_20261127"
down_revision = "add_bot_is_active_20260525"
branch_labels = None
depends_on = None


def upgrade() -> None:
    schema = Path(__file__).resolve().parents[1] / "sql" / "20261127_inbox.sql"
    for statement in schema.read_text().split(";"):
        if statement.strip():
            op.execute(statement)


def downgrade() -> None:
    for table in ("inbox_jobs", "inbox_messages", "inbox_events", "inbox_conversations"):
        op.drop_table(table)
