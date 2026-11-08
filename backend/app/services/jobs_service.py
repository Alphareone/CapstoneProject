"""Procesamiento de exportaciones e ingestas ejecutadas por Celery."""
from __future__ import annotations

import csv
import json
import logging
import os
import tempfile
from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.jobs import ExportJob, IngestJob
from app.models.property import Property
from app.services import query as property_query

logger = logging.getLogger(__name__)

DEFAULT_EXPORT_COLUMNS = [
    "address", "city", "zip", "flag", "opening_price", "arv", "roi", "auction_date"
]
EXPORT_COLUMNS = {
    "address", "city", "zip", "flag", "opening_price", "arv", "roi",
    "auction_date", "auction_type", "property_type", "county_id", "beds", "baths", "sqft",
}

IngestImporter = Callable[[AsyncSession, IngestJob], Awaitable[dict[str, int]]]
# Los adaptadores específicos de cada fuente se registran aquí. No se inventa
# un formato CSV común mientras el contrato de los archivos de origen no exista.
INGEST_IMPORTERS: dict[str, IngestImporter] = {}


def register_ingest_importer(source: str, importer: IngestImporter) -> None:
    """Registra el adaptador que procesa una fuente concreta de datos."""
    normalized_source = source.strip()
    if not normalized_source:
        raise ValueError("El nombre de la fuente de ingesta no puede estar vacío.")
    INGEST_IMPORTERS[normalized_source] = importer


def _export_directory() -> Path:
    directory = Path(settings.EXPORT_STORAGE_DIR).expanduser().resolve()
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def export_file_path(job: ExportJob) -> Path:
    """Devuelve una ruta construida solo con el ID generado por el backend."""
    extension = "xlsx" if job.format == "xlsx" else "csv"
    return _export_directory() / f"{job.id}.{extension}"


def _safe_spreadsheet_value(value: Any) -> Any:
    # Evita que texto importado se interprete como fórmula al abrir CSV/XLSX.
    if isinstance(value, str) and value.startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + value
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _record_for_property(prop: Property) -> dict[str, Any]:
    fin = prop.financial
    legal = prop.legal
    physical = prop.physical
    return {
        "address": prop.address,
        "city": prop.city,
        "zip": prop.zip,
        "flag": prop.flag,
        "opening_price": fin.opening_price if fin else None,
        "arv": fin.arv if fin else None,
        "roi": fin.estimated_roi if fin else None,
        "auction_date": legal.auction_date if legal else None,
        "auction_type": legal.auction_type if legal else None,
        "property_type": prop.property_type,
        "county_id": prop.county_id,
        "beds": physical.beds if physical else None,
        "baths": physical.baths if physical else None,
        "sqft": physical.sqft if physical else None,
    }


def _write_export_file(path: Path, file_format: str, columns: list[str], rows: list[dict[str, Any]]) -> None:
    if file_format == "csv":
        with path.open("w", encoding="utf-8-sig", newline="") as output:
            writer = csv.writer(output)
            writer.writerow(columns)
            for record in rows:
                writer.writerow([_safe_spreadsheet_value(record.get(column)) for column in columns])
        return

    if file_format == "xlsx":
        from openpyxl import Workbook

        workbook = Workbook(write_only=True)
        worksheet = workbook.create_sheet(title="Propiedades")
        worksheet.append(columns)
        for record in rows:
            worksheet.append([
                _safe_spreadsheet_value(record.get(column)) for column in columns
            ])
        workbook.save(path)
        return

    raise ValueError(f"Formato de exportación no soportado: {file_format}")


async def _set_export_failed(job_id: str, message: str) -> None:
    async with AsyncSessionLocal() as db:
        job = await db.get(ExportJob, job_id)
        if job is not None:
            job.status = "failed"
            job.error_message = message[:2000]
            job.download_url = None
            await db.commit()


async def run_export_job(job_id: str) -> dict[str, Any]:
    """Genera CSV/XLSX aplicando IDs y los filtros solicitados."""
    output_path: Path | None = None
    try:
        async with AsyncSessionLocal() as db:
            job = await db.get(ExportJob, job_id)
            if job is None:
                return {"job_id": job_id, "status": "missing"}
            if job.status == "completed":
                return {"job_id": job_id, "status": "completed", "row_count": job.row_count}

            job.status = "processing"
            job.error_message = None
            await db.commit()

            params = json.loads(job.params or "{}")
            columns = params.get("columns") or DEFAULT_EXPORT_COLUMNS
            if not isinstance(columns, list) or not columns:
                raise ValueError("La lista de columnas de exportación está vacía o no es válida.")
            unknown_columns = sorted(set(columns) - EXPORT_COLUMNS)
            if unknown_columns:
                raise ValueError(f"Columnas no soportadas: {', '.join(unknown_columns)}")
            if len(columns) != len(set(columns)):
                raise ValueError("La exportación contiene columnas duplicadas.")

            stmt = (
                select(Property)
                .options(
                    selectinload(Property.financial),
                    selectinload(Property.legal),
                    selectinload(Property.physical),
                )
                .where(Property.archived.is_(False))
            )
            property_ids = params.get("property_ids")
            if property_ids:
                stmt = stmt.where(Property.id.in_(property_ids))

            filters = params.get("filters") or {}
            if filters:
                stmt = property_query.apply_filters(stmt, **filters)

            result = await db.execute(stmt.order_by(Property.created_at.desc()))
            properties = result.scalars().unique().all()
            records = [_record_for_property(prop) for prop in properties]

            output_path = export_file_path(job)
            fd, temporary_name = tempfile.mkstemp(
                prefix=f"{job.id}_", suffix=f".{job.format}.tmp", dir=output_path.parent
            )
            os.close(fd)
            temporary_path = Path(temporary_name)
            try:
                _write_export_file(temporary_path, job.format, columns, records)
                os.replace(temporary_path, output_path)
            finally:
                temporary_path.unlink(missing_ok=True)

            job.status = "completed"
            job.row_count = len(properties)
            job.download_url = f"/api/v1/exports/{job.id}/download"
            job.expires_at = datetime.now(timezone.utc) + timedelta(
                hours=settings.EXPORT_EXPIRE_HOURS
            )
            job.error_message = None
            await db.commit()
            return {"job_id": job.id, "status": job.status, "row_count": job.row_count}

    except Exception as exc:
        if output_path is not None:
            output_path.unlink(missing_ok=True)
        logger.exception("Falló el trabajo de exportación %s", job_id)
        message = f"No se pudo generar la exportación ({type(exc).__name__})."
        await _set_export_failed(job_id, message)
        raise


async def _set_ingest_failed(job_id: str, message: str) -> None:
    async with AsyncSessionLocal() as db:
        job = await db.get(IngestJob, job_id)
        if job is not None:
            job.status = "failed"
            job.failed = max(job.failed, 1)
            job.error_message = message[:2000]
            job.finished_at = datetime.now(timezone.utc)
            await db.commit()


async def run_ingest_job(job_id: str) -> dict[str, Any]:
    """Ejecuta un adaptador de ingesta registrado para el valor de source."""
    try:
        async with AsyncSessionLocal() as db:
            job = await db.get(IngestJob, job_id)
            if job is None:
                return {"job_id": job_id, "status": "missing"}
            if job.status == "completed":
                return {"job_id": job_id, "status": "completed"}
            job.status = "processing"
            job.error_message = None
            await db.commit()

            importer = INGEST_IMPORTERS.get(job.source)
            if importer is None:
                raise NotImplementedError(
                    f"No existe un importador registrado para la fuente '{job.source}'."
                )

            counts = await importer(db, job)
            job.created = int(counts.get("created", 0))
            job.updated = int(counts.get("updated", 0))
            job.failed = int(counts.get("failed", 0))
            job.status = "completed" if job.failed == 0 else "failed"
            job.error_message = None if job.failed == 0 else "Una o más filas no pudieron importarse."
            job.finished_at = datetime.now(timezone.utc)
            await db.commit()
            return {
                "job_id": job.id,
                "status": job.status,
                "created": job.created,
                "updated": job.updated,
                "failed": job.failed,
            }
    except Exception as exc:
        logger.exception("Falló el trabajo de ingesta %s", job_id)
        message = (
            str(exc) if isinstance(exc, NotImplementedError)
            else f"No se pudo completar la ingesta ({type(exc).__name__})."
        )
        await _set_ingest_failed(job_id, message)
        raise
