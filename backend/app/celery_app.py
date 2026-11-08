"""Configuración central de Celery para ClearBid NJ."""
from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "clearbid_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.jobs"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone=settings.DEFAULT_TZ,
    enable_utc=True,
    task_track_started=True,
    task_default_queue="default",
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    result_expires=3600,
)
