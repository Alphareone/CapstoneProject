"""Agrega mensajes de error a los trabajos asíncronos.

Revision ID: 0002_job_error_message
Revises: 0001_initial
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_job_error_message"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def _existing_columns(table_name: str) -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    # 0001_initial crea desde Base.metadata; por eso esta comprobación permite
    # convivir con bases nuevas y con bases donde 0001 ya fue ejecutada.
    if "error_message" not in _existing_columns("ingest_jobs"):
        op.add_column("ingest_jobs", sa.Column("error_message", sa.Text(), nullable=True))
    if "error_message" not in _existing_columns("export_jobs"):
        op.add_column("export_jobs", sa.Column("error_message", sa.Text(), nullable=True))


def downgrade() -> None:
    if "error_message" in _existing_columns("export_jobs"):
        op.drop_column("export_jobs", "error_message")
    if "error_message" in _existing_columns("ingest_jobs"):
        op.drop_column("ingest_jobs", "error_message")
