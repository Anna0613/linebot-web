"""Versioned R2 knowledge in the pilot inbox."""
from pathlib import Path

from alembic import op

revision = "inbox_sources_20261127"
down_revision = "inbox_drafts_20261127"
branch_labels = None
depends_on = None


def upgrade():
    path = Path(__file__).resolve().parents[1] / "sql/20261127_knowledge_versions.sql"
    for statement in path.read_text().split("-- next statement"):
        op.execute(statement.strip())


def downgrade():
    op.drop_table("inbox_flow_releases")
    op.execute("DROP VIEW inbox_published_sections")
    op.drop_table("inbox_source_sections")
    op.drop_table("inbox_source_versions")
    op.drop_table("inbox_sources")
