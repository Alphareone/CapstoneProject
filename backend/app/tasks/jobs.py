"""Tareas Celery para procesar ingestas y exportaciones."""
from __future__ import annotations

import asyncio

from app.celery_app import celery_app
from app.services.jobs_service import run_export_job, run_ingest_job

# Celery usa procesos prefork por defecto. Mantener un loop por proceso evita
# reutilizar conexiones asyncpg entre loops distintos al ejecutar varias tareas.
_worker_loop: asyncio.AbstractEventLoop | None = None


def _run_coroutine(coroutine):
    global _worker_loop
    if _worker_loop is None or _worker_loop.is_closed():
        _worker_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_worker_loop)
    return _worker_loop.run_until_complete(coroutine)


@celery_app.task(name="app.tasks.jobs.process_export_job")
def process_export_job(job_id: str) -> dict:
    """Genera un archivo de exportación fuera del proceso HTTP."""
    return _run_coroutine(run_export_job(job_id))


@celery_app.task(name="app.tasks.jobs.process_ingest_job")
def process_ingest_job(job_id: str) -> dict:
    """Ejecuta el importador registrado para el origen indicado."""
    return _run_coroutine(run_ingest_job(job_id))
