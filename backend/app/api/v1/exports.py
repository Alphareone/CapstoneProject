"""Sección 6.3 — Exportación asíncrona (CSV / Excel)."""
from datetime import datetime, timezone
import json

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.jobs import ExportJob
from app.models.user import User
from app.schemas.web import ExportJobResponse, ExportJobStatus, ExportRequest
from app.services.jobs_service import export_file_path
from app.tasks.jobs import process_export_job

router = APIRouter(tags=["Exportación (web)"])


@router.post(
    "/properties/export",
    response_model=ExportJobResponse,
    status_code=202,
    summary="Iniciar exportación (por IDs o filtro)",
    responses={401: {}, 422: {}, 503: {"description": "Cola de trabajos no disponible"}},
)
async def start_export(
    body: ExportRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    params = {
        "property_ids": body.property_ids,
        "filters": body.filters.model_dump(exclude_none=True) if body.filters else None,
        "columns": body.columns,
    }
    job = ExportJob(
        user_id=user.id, format=body.format, status="queued",
        params=json.dumps(params),
    )
    db.add(job)
    await db.flush()
    job_id = job.id
    # El worker puede arrancar inmediatamente: la fila debe estar confirmada primero.
    await db.commit()
    try:
        process_export_job.delay(job_id)
    except Exception as exc:
        job = await db.get(ExportJob, job_id)
        if job is not None:
            job.status = "failed"
            job.error_message = "No fue posible enviar el trabajo a la cola Redis."
            await db.commit()
        raise errors.APIError(503, "queue_unavailable", "No se pudo iniciar la exportación.") from exc
    return ExportJobResponse(job_id=job_id, status="queued")


@router.get(
    "/exports/{job_id}",
    response_model=ExportJobStatus,
    summary="Estado del trabajo de exportación y URL de descarga",
    responses={404: {}},
)
async def export_status(
    job_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    job = await db.get(ExportJob, job_id)
    if job is None or job.user_id != user.id:
        raise errors.not_found("Trabajo de exportación inexistente.")
    return ExportJobStatus(
        job_id=job.id, status=job.status, row_count=job.row_count,
        download_url=job.download_url, expires_at=job.expires_at,
        error_message=job.error_message,
    )


@router.get(
    "/exports/{job_id}/download",
    summary="Descargar el archivo generado por una exportación propia",
    responses={404: {}, 410: {}},
)
async def download_export(
    job_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    job = await db.get(ExportJob, job_id)
    if job is None or job.user_id != user.id:
        raise errors.not_found("Trabajo de exportación inexistente.")
    if job.status != "completed":
        raise errors.conflict("La exportación todavía no está disponible.")
    expires_at = job.expires_at
    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) >= expires_at:
            raise errors.gone("El archivo de exportación ha expirado.")

    path = export_file_path(job)
    if not path.is_file():
        raise errors.not_found("El archivo de exportación no se encuentra disponible.")
    media_type = (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if job.format == "xlsx" else "text/csv; charset=utf-8"
    )
    return FileResponse(
        path=path,
        media_type=media_type,
        filename=f"clearbid-export-{job.id}.{job.format}",
    )
