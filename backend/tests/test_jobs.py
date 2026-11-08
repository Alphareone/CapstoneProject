"""Pruebas de exportaciones y trabajos de ingesta asíncronos."""
import csv
import json

import pytest

from tests.conftest import TestSession

pytestmark = pytest.mark.asyncio


async def test_export_job_creates_csv_and_applies_filters(monkeypatch, tmp_path):
    from app.core.config import settings
    from app.models.geography import County
    from app.models.jobs import ExportJob
    from app.models.property import Property, PropertyFinancial
    from app.models.user import User
    from app.services import jobs_service

    monkeypatch.setattr(settings, "EXPORT_STORAGE_DIR", str(tmp_path))
    monkeypatch.setattr(jobs_service, "AsyncSessionLocal", TestSession)

    async with TestSession() as db:
        county = County(name="Essex", state="NJ", main_city="Newark")
        user = User(
            first_name="Export", last_name="Tester", email="export@test.com",
            role="investor", is_active=True,
        )
        db.add_all([county, user])
        await db.flush()

        matching = Property(
            address="=1+1 Clinton Ave", city="Newark", zip="07108",
            county_id=county.id, property_type="single_family", flag="green",
        )
        non_matching = Property(
            address="200 Main St", city="Newark", zip="07108",
            county_id=county.id, property_type="condo", flag="red",
        )
        db.add_all([matching, non_matching])
        await db.flush()
        db.add_all([
            PropertyFinancial(
                property_id=matching.id, opening_price=42000,
                arv=120000, estimated_roi=0.28,
            ),
            PropertyFinancial(
                property_id=non_matching.id, opening_price=50000,
                arv=90000, estimated_roi=0.12,
            ),
        ])
        job = ExportJob(
            user_id=user.id,
            format="csv",
            status="queued",
            params=json.dumps({
                "filters": {"flag": ["green"]},
                "columns": ["address", "opening_price", "arv"],
            }),
        )
        db.add(job)
        await db.commit()
        job_id = job.id

    result = await jobs_service.run_export_job(job_id)
    assert result["status"] == "completed"
    assert result["row_count"] == 1

    async with TestSession() as db:
        completed = await db.get(ExportJob, job_id)
        assert completed is not None
        assert completed.download_url == f"/api/v1/exports/{job_id}/download"
        assert completed.error_message is None
        path = jobs_service.export_file_path(completed)

    with path.open(encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))
    assert len(rows) == 1
    assert rows[0]["address"] == "'=1+1 Clinton Ave"
    assert rows[0]["opening_price"] == "42000"


async def test_ingest_without_registered_adapter_is_not_reported_as_success(
    monkeypatch, tmp_path
):
    from app.models.jobs import IngestJob
    from app.services import jobs_service

    monkeypatch.setattr(jobs_service, "AsyncSessionLocal", TestSession)
    jobs_service.INGEST_IMPORTERS.pop("unknown_test_source", None)

    async with TestSession() as db:
        job = IngestJob(source="unknown_test_source", status="queued")
        db.add(job)
        await db.commit()
        job_id = job.id

    with pytest.raises(NotImplementedError):
        await jobs_service.run_ingest_job(job_id)

    async with TestSession() as db:
        failed = await db.get(IngestJob, job_id)
        assert failed is not None
        assert failed.status == "failed"
        assert failed.failed == 1
        assert "No existe un importador" in failed.error_message
        assert failed.finished_at is not None


async def test_celery_tasks_are_registered_on_the_worker_queue():
    from app.celery_app import celery_app
    from app.tasks.jobs import process_export_job, process_ingest_job

    assert celery_app.conf.task_default_queue == "default"
    assert process_export_job.name == "app.tasks.jobs.process_export_job"
    assert process_ingest_job.name == "app.tasks.jobs.process_ingest_job"
