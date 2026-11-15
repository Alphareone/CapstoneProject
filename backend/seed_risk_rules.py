"""Carga/actualiza el catálogo inicial de riesgos ClearBid NJ.

Ejecutar desde backend: python seed_risk_rules.py
Es idempotente: puede ejecutarse más de una vez sin duplicar reglas.
"""
import asyncio
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.rules import Rule
from app.services.property_service import recalculate_traffic_light
from app.models.property import Property
from app.services.documentary_risk import apply_documentary_findings

RULES = [
    {
        "code": "IRS_SURVIVING_LIEN",
        "severity": "critical",
        "title": "Surviving IRS lien",
        "description": "Gravamen federal del IRS que sobrevive a la subasta.",
        "condition": "legal.surviving_irs_lien > 0",
        "message": "Existe un gravamen del IRS informado como sobreviviente. Requiere revisión legal antes de ofertar.",
    },
    {
        "code": "SENIOR_LIEN_SURVIVES",
        "severity": "critical",
        "title": "Senior lien detected",
        "description": "Gravamen senior informado que puede permanecer tras la subasta.",
        "condition": "legal.senior_liens > 0",
        "message": "Se informó un gravamen senior. Confirmar prioridad y supervivencia con revisión de título.",
    },
    {
        "code": "CLOUDED_TITLE",
        "severity": "critical",
        "title": "Clouded title",
        "description": "El título aparece con problemas o disputas.",
        "condition": "legal.title_status not in ['clean', 'clear', 'clear_title']",
        "message": "El estado del título presenta una alerta. Requiere revisión de un abogado antes de ofertar.",
    },
    {
        "code": "BANKRUPTCY_INDICATOR",
        "severity": "critical",
        "title": "Bankruptcy indicator",
        "description": "Indicador de bancarrota asociado al caso o titular.",
        "condition": "legal.bankruptcy_indicator is True",
        "message": "Se detectó un indicador de bancarrota. Requiere revisión legal antes de ofertar.",
    },
    {
        "code": "TOTAL_LIENS_REVIEW",
        "severity": "warning",
        "title": "Liens require review",
        "description": "Solo evalúa el total de gravámenes cuando fue contrastado con una fuente actual; NULL significa no verificado.",
        "condition": "financial.total_liens_verified is True and financial.total_liens > 0",
        "message": "Hay gravámenes confirmados en una consulta actual. Revisar prioridad, tipo y si permanecen después de la subasta.",
    },
    {
        "code": "OPEN_PERMITS",
        "severity": "warning",
        "title": "Open permits",
        "description": "Permisos de construcción abiertos o pendientes.",
        "condition": "legal.open_permits_count > 0",
        "message": "Existen permisos abiertos. Revisar su alcance, costo y proceso de cierre.",
    },
    {
        "code": "MULTIPLE_DEFENDANTS",
        "severity": "warning",
        "title": "Multiple defendants",
        "description": "El expediente identifica a más de un demandado.",
        "condition": "legal.defendant_count > 1",
        "message": "El expediente incluye múltiples demandados. Revisar el caso y las partes involucradas.",
    },
    {
        "code": "LLC_OWNERSHIP",
        "severity": "warning",
        "title": "LLC ownership",
        "description": "La titularidad aparece asociada a una LLC.",
        "condition": "legal.ownership_type.lower() == 'llc'",
        "message": "La propiedad figura a nombre de una LLC. Verificar entidad, autoridad y documentación.",
    },
    {
        "code": "MORTGAGE_ACTIVE",
        "severity": "warning",
        "title": "Active mortgage",
        "description": "Se informa una hipoteca activa; debe verificarse si sobrevive a la subasta.",
        "condition": "legal.mortgage_active is True",
        "message": "Se informó una hipoteca activa. Confirmar saldo, prioridad y supervivencia mediante revisión de título.",
    },
    {
        "code": "OCCUPIED_PROPERTY",
        "severity": "warning",
        "title": "Occupied property",
        "description": "Propiedad ocupada; requiere análisis de posesión y proceso de entrega.",
        "condition": "legal.occupancy == 'occupied'",
        "message": "La propiedad figura ocupada. Considerar revisión del proceso de posesión.",
    },
]

async def main() -> None:
    async with AsyncSessionLocal() as db:
        try:
            for data in RULES:
                row = (await db.execute(
                    select(Rule).where(Rule.code == data["code"])
                )).scalar_one_or_none()
                if row is None:
                    row = Rule(**data, active=True)
                    db.add(row)
                    print(f"CREADA: {data['code']}")
                else:
                    for key, value in data.items():
                        setattr(row, key, value)
                    row.active = True
                    print(f"ACTUALIZADA: {data['code']}")
            await db.flush()
            evidence_count, evidence_missing = await apply_documentary_findings(db)
            properties = (await db.execute(
                select(Property.id).where(Property.archived.is_(False))
            )).scalars().all()
            for property_id in properties:
                await recalculate_traffic_light(db, property_id)
            await db.commit()
            print(f"OK: {len(RULES)} reglas; {len(properties)} propiedades recalculadas.")
            print(f"ANTECEDENTES: {evidence_count}/11 propiedades cargadas.")
            for item in evidence_missing:
                print(f"NO COINCIDE: {item}")
        except Exception:
            await db.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(main())
