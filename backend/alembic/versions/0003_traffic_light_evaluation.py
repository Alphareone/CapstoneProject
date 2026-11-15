"""Permite semáforo pendiente y distingue evaluaciones incompletas.

Revision ID: 0003_traffic_light_evaluation
Revises: 0002_job_error_message
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_traffic_light_evaluation"
down_revision = "0002_job_error_message"
branch_labels = None
depends_on = None


def _columns() -> dict[str, dict]:
    return {
        column["name"]: column
        for column in sa.inspect(op.get_bind()).get_columns("traffic_light_results")
    }


def upgrade() -> None:
    columns = _columns()
    # 0001_initial construye tablas desde los modelos presentes al momento
    # de ejecutar la migración; por eso estas operaciones deben ser idempotentes.
    if "evaluation_status" not in columns:
        op.add_column(
            "traffic_light_results",
            sa.Column("evaluation_status", sa.String(length=20), nullable=False, server_default="pending"),
        )
    if not columns["flag"].get("nullable", False):
        op.alter_column(
            "traffic_light_results", "flag",
            existing_type=sa.String(length=10), nullable=True,
        )

    # Los colores anteriores podían ser valores manuales o cálculos hechos
    # con un catálogo vacío/antiguo. No se conservan como LOW/CLEAR probado.
    op.execute("UPDATE traffic_light_results SET flag = NULL, evaluation_status = 'pending'")
    op.execute("UPDATE properties SET flag = NULL")


def downgrade() -> None:
    op.execute("UPDATE traffic_light_results SET flag = 'green' WHERE flag IS NULL")
    if "evaluation_status" in _columns():
        op.drop_column("traffic_light_results", "evaluation_status")
    columns = _columns()
    if columns["flag"].get("nullable", True):
        op.alter_column(
            "traffic_light_results", "flag",
            existing_type=sa.String(length=10), nullable=False,
        )
