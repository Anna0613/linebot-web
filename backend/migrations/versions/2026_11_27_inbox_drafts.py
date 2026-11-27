"""Add on-demand, evidence-linked pilot drafts."""
from pathlib import Path

from alembic import op

revision = "inbox_drafts_20261127"
down_revision = "inbox_20261127"
branch_labels = None
depends_on = None


def upgrade():
    # Execute the PostgreSQL function body intact.
    source = Path(__file__).resolve().parents[1] / "sql" / "20261127_inbox_drafts.sql"
    from sqlalchemy.schema import DDL
    for statement in source.read_text().split("-- next statement"):
        op.execute(DDL(statement.strip()))


def downgrade():
    op.execute("DROP TRIGGER clear_inbox_draft ON inbox_jobs")
    op.execute("DROP FUNCTION clear_cancelled_inbox_draft()")
    op.drop_index("inbox_draft_queue", table_name="inbox_jobs")
    for col in ("draft_state", "draft_lease", "draft_started_at", "draft_body", "draft_chunk",
                "draft_hash", "draft_tools", "draft_model"):
        op.drop_column("inbox_jobs", col)
