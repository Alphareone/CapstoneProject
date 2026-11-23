"""Sección 6.3 — Exportación asíncrona (CSV / Excel) y envío de dossier PDF por correo."""
import json
import os
import urllib.request

from fastapi import APIRouter, BackgroundTasks, Body, Depends, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import errors
from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.jobs import ExportJob
from app.models.property import Property
from app.models.user import User
from app.schemas.web import ExportJobResponse, ExportJobStatus, ExportRequest
from app.services import jobs_service

router = APIRouter(tags=["Exportación (web)"])


class EmailDossierRequest(BaseModel):
    lang: str = "en"
    pdf_base64: str | None = None
    filename: str | None = None


@router.post(
    "/properties/export",
    response_model=ExportJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Iniciar exportación (por IDs o filtro)",
    responses={401: {}, 422: {}},
)
async def start_export(
    body: ExportRequest,
    background: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    params = {
        "property_ids": body.property_ids,
        "filters": body.filters.model_dump(exclude_none=True) if body.filters else None,
        "columns": body.columns,
    }
    job = ExportJob(
        user_id=user.id, format=body.format, status="queued", params=json.dumps(params)
    )
    db.add(job)
    await db.flush()
    job_id = job.id
    background.add_task(jobs_service.run_export_job, job_id)
    return ExportJobResponse(job_id=job_id, status="queued")


@router.get(
    "/exports/{job_id}",
    response_model=ExportJobStatus,
    summary="Estado del trabajo de exportación y URL de descarga",
    responses={404: {}},
)
async def export_status(
    job_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await db.get(ExportJob, job_id)
    if job is None or job.user_id != user.id:
        raise errors.not_found("Trabajo de exportación inexistente.")
    return ExportJobStatus(
        job_id=job.id,
        status=job.status,
        row_count=job.row_count,
        download_url=job.download_url,
        expires_at=job.expires_at,
    )


def _send_dossier_brevo(
    to_email: str,
    prop: Property,
    lang: str = "en",
    pdf_base64: str | None = None,
    filename: str | None = None,
) -> None:
    brevo_api_key = os.getenv("BREVO_API_KEY")
    sender_email = (
        os.getenv("SMTP_USER")
        or getattr(settings, "SMTP_USER", None)
        or "elpapucris1404@gmail.com"
    )
    if not brevo_api_key:
        print(
            f"[DOSSIER-EMAIL-STUB] Copia enviada (simulada) a {to_email} para {prop.address}"
        )
        return

    fin = prop.financial
    leg = prop.legal
    opening = f"${fin.opening_price:,.0f}" if fin and fin.opening_price else "N/A"
    arv = f"${fin.arv:,.0f}" if fin and fin.arv else "N/A"
    roi = f"{fin.estimated_roi}%" if fin and fin.estimated_roi is not None else "N/A"
    max_bid = (
        f"${fin.suggested_max_bid:,.0f}" if fin and fin.suggested_max_bid else "N/A"
    )
    case_no = leg.case_number if leg and leg.case_number else "Pending"
    flag_label = (prop.flag or (leg.documentary_flag if leg else None) or "HIGH").upper()

    is_es = lang.lower().startswith("es")
    if is_es:
        subject = f"ClearBid NJ · Dossier PDF de Subasta: {prop.address}"
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #1A1A1A; line-height: 1.5;">
            <h2 style="color: #1B2A4A;">ClearBid NJ · Dossier Pre-Subasta</h2>
            <p>Adjuntamos en PDF el reporte completo de debida diligencia de la propiedad que descargaste en ClearBid NJ:</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 560px; margin: 16px 0;">
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Propiedad</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{prop.address}, {prop.city}, NJ {prop.zip}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Clasificación de Riesgo</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{flag_label}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Opening Bid</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{opening}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>ARV Estimado</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{arv}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Puja Máxima Sugerida</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{max_bid}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>ROI Estimado</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{roi}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Expediente / Case #</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{case_no}</td></tr>
            </table>
            <p style="font-size: 12px; color: #666;">
              ClearBid NJ is an information business and does not provide legal, tax, or investment advice.
            </p>
          </body>
        </html>
        """
    else:
        subject = f"ClearBid NJ · Pre-Auction PDF Dossier: {prop.address}"
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #1A1A1A; line-height: 1.5;">
            <h2 style="color: #1B2A4A;">ClearBid NJ · Pre-Auction Property Dossier</h2>
            <p>Please find attached the full PDF due diligence dossier for the auction property you exported on ClearBid NJ:</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 560px; margin: 16px 0;">
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Property</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{prop.address}, {prop.city}, NJ {prop.zip}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Risk Classification</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{flag_label}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Opening Bid</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{opening}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Estimated ARV</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{arv}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Suggested Max Bid</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{max_bid}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Estimated Net ROI</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{roi}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Docket / Case #</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{case_no}</td></tr>
            </table>
            <p style="font-size: 12px; color: #666;">
              ClearBid NJ is an information service and does not provide legal, tax, or investment advice.
            </p>
          </body>
        </html>
        """

    payload: dict = {
        "sender": {"name": "ClearBid NJ", "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html,
    }
    if pdf_base64:
        payload["attachment"] = [
            {
                "name": filename or "ClearBid-Property-Dossier.pdf",
                "content": pdf_base64,
            }
        ]

    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "api-key": brevo_api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"[DOSSIER-EMAIL] Enviado con PDF a {to_email} (status {resp.status})")
    except Exception as e:
        print(f"[DOSSIER-EMAIL-ERROR] {e}")


@router.post(
    "/properties/{property_id}/email-dossier",
    summary="Enviar copia del dossier PDF de propiedad al correo del usuario",
)
async def email_property_dossier(
    property_id: str,
    background: BackgroundTasks,
    body: EmailDossierRequest | None = Body(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Property)
        .options(selectinload(Property.financial), selectinload(Property.legal))
        .where(Property.id == property_id)
    )
    prop = (await db.execute(stmt)).scalar_one_or_none()
    if prop is None:
        raise errors.not_found("Propiedad inexistente.")
    lang = body.lang if body else "en"
    pdf_base64 = body.pdf_base64 if body else None
    filename = body.filename if body else None
    if user.email:
        background.add_task(
            _send_dossier_brevo, user.email, prop, lang, pdf_base64, filename
        )
    return {"sent": True, "email": user.email}