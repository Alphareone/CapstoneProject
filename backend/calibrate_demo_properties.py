"""Calibra propiedades verificadas de Mercer County para mostrar distribución
equilibrada entre riesgo Bajo (Verde), Moderado (Amarillo) y Alto (Rojo).

Uso desde backend/:
    python calibrate_demo_properties.py
"""
import asyncio
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.property import Property, PropertyFinancial, PropertyLegal
from app.services.property_service import recalculate_traffic_light

CLEAN_CANDIDATE_PREFIXES = (
    "11 TRENT STREET",
    "229 MOUNT LUCAS ROAD",
    "739 WILLIAM STREET",
    "74 LOUISE LANE",
    "99 WEST STREET",
)


async def main() -> None:
    async with AsyncSessionLocal() as db:
        try:
            props = (
                await db.execute(select(Property).where(Property.archived.is_(False)))
            ).scalars().all()

            updated = 0
            for prop in props:
                addr_upper = (prop.address or "").upper()
                if any(addr_upper.startswith(prefix) for prefix in CLEAN_CANDIDATE_PREFIXES):
                    legal = await db.get(PropertyLegal, prop.id)
                    if legal is None:
                        legal = PropertyLegal(property_id=prop.id)
                        db.add(legal)

                    legal.title_status = "clean"
                    legal.occupancy = "vacant"
                    legal.surviving_irs_lien = 0
                    legal.senior_liens = 0
                    legal.bankruptcy_indicator = False
                    legal.open_permits_count = 0
                    legal.defendant_count = 1
                    legal.ownership_type = "individual"
                    legal.mortgage_active = False

                    fin = await db.get(PropertyFinancial, prop.id)
                    if fin is not None:
                        fin.total_liens = 0
                        fin.total_liens_verified = True

                    updated += 1
                    print(f"✅ Calibrada como limpia (Verde): {prop.address}")

            await db.flush()

            for prop in props:
                await recalculate_traffic_light(db, prop.id)

            await db.commit()
            print(f"\n🚀 Listo: {updated} propiedades calibradas a LOW/CLEAR y {len(props)} semáforos recalculados.")
        except Exception:
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(main())