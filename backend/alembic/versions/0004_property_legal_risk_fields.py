"""Agrega datos legales usados por el catálogo de riesgos.

Revision ID: 0004_property_legal_risk_fields
Revises: 0003_traffic_light_evaluation
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_property_legal_risk_fields"
down_revision = "0003_traffic_light_evaluation"
branch_labels = None
depends_on = None

_NEW_COLUMNS = {
    "bankruptcy_indicator": sa.Column("bankruptcy_indicator", sa.Boolean(), nullable=True),
    "open_permits_count": sa.Column("open_permits_count", sa.Integer(), nullable=True),
    "defendant_count": sa.Column("defendant_count", sa.Integer(), nullable=True),
    "ownership_type": sa.Column("ownership_type", sa.String(length=30), nullable=True),
    "mortgage_active": sa.Column("mortgage_active", sa.Boolean(), nullable=True),
}


def _columns() -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns("property_legal")}


def upgrade() -> None:
    # Compatible con 0001_initial, que crea el esquema desde los modelos actuales.
    existing = _columns()
    for name, column in _NEW_COLUMNS.items():
        if name not in existing:
            op.add_column("property_legal", column)


def downgrade() -> None:
    existing = _columns()
    for name in reversed(list(_NEW_COLUMNS)):
        if name in existing:
            op.drop_column("property_legal", name)
