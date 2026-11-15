"""Añade antecedentes documentales preliminares separados del semáforo final.

Revision ID: 0005_documentary_risk_evidence
Revises: 0004_property_legal_risk_fields
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_documentary_risk_evidence"
down_revision = "0004_property_legal_risk_fields"
branch_labels = None
depends_on = None

_COLUMNS = {
    "documentary_flag": sa.Column("documentary_flag", sa.String(length=10), nullable=True),
    "documentary_status": sa.Column("documentary_status", sa.String(length=30), nullable=True),
    "documentary_summary": sa.Column("documentary_summary", sa.Text(), nullable=True),
    "documentary_evidence": sa.Column("documentary_evidence", sa.Text(), nullable=True),
    "documentary_updated_at": sa.Column("documentary_updated_at", sa.DateTime(timezone=True), nullable=True),
}

_FINANCIAL_COLUMNS = {
    "total_liens_verified": sa.Column("total_liens_verified", sa.Boolean(), nullable=True),
}

def _columns(table: str) -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}

def upgrade() -> None:
    existing_legal = _columns("property_legal")
    for name, column in _COLUMNS.items():
        if name not in existing_legal:
            op.add_column("property_legal", column)
    existing_financial = _columns("property_financials")
    for name, column in _FINANCIAL_COLUMNS.items():
        if name not in existing_financial:
            op.add_column("property_financials", column)

def downgrade() -> None:
    existing_financial = _columns("property_financials")
    for name in reversed(list(_FINANCIAL_COLUMNS)):
        if name in existing_financial:
            op.drop_column("property_financials", name)
    existing_legal = _columns("property_legal")
    for name in reversed(list(_COLUMNS)):
        if name in existing_legal:
            op.drop_column("property_legal", name)
