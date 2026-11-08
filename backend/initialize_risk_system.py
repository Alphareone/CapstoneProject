"""Inicializa reglas y antecedentes de riesgo automáticamente al arrancar la API.

No sobrescribe reglas que un administrador haya editado. La carga documental
es versionada e idempotente. El semáforo solo se recalcula si faltan reglas,
no existe resultado o cambió la versión del motor.
"""
import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.property import Property
from app.models.rules import Rule, TrafficLightResult
from app.services.documentary_risk import apply_documentary_findings
from app.services.property_service import recalculate_traffic_light
from app.services.traffic_light import ENGINE_VERSION
from seed_risk_rules import RULES

async def main() -> None:
    async with AsyncSessionLocal() as db:
        try:
            rules_changed = False
            for data in RULES:
                existing = (await db.execute(select(Rule).where(Rule.code == data["code"]))).scalar_one_or_none()
                if existing is None:
                    db.add(Rule(**data, active=True))
                    rules_changed = True
                elif data["code"] == "TOTAL_LIENS_REVIEW" and existing.condition != data["condition"]:
                    # Esta regla cambió para exigir verificación explícita del saldo.
                    # No se pisan otras reglas que un administrador haya personalizado.
                    existing.condition = data["condition"]
                    existing.description = data["description"]
                    existing.message = data["message"]
                    rules_changed = True
            await db.flush()
            loaded, missing = await apply_documentary_findings(db)
            property_ids = (await db.execute(select(Property.id).where(Property.archived.is_(False)))).scalars().all()
            recalculated = 0
            for property_id in property_ids:
                result = await db.get(TrafficLightResult, property_id)
                if (rules_changed or result is None or result.engine_version != ENGINE_VERSION
                    or result.evaluation_status in {"pending", "not_configured"}):
                    await recalculate_traffic_light(db, property_id)
                    recalculated += 1
            await db.commit()
            print(f"RISK SYSTEM READY: {loaded}/11 documentary records; {recalculated} recalculations; engine {ENGINE_VERSION}.")
            for item in missing:
                print(f"DOCUMENTARY ADDRESS NOT MATCHED: {item}")
        except Exception:
            await db.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(main())
