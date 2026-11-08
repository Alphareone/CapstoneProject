"""Sonda de salud para comprobar disponibilidad real de la base de datos."""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine

router = APIRouter(tags=["Utilidad"])


@router.get("/health", summary="Sonda de salud", responses={503: {"description": "DB caída"}})
async def health():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "version": settings.APP_VERSION, "db": "down"},
        )
    return {"status": "ok", "version": settings.APP_VERSION, "db": "up"}
