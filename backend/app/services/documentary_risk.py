"""Antecedentes documentales preliminares de las 11 propiedades revisadas.

Este módulo NO consulta portales externos ni certifica títulos. Registra de forma
idempotente la investigación disponible al 2026-11-08. Las cantidades históricas
se guardan como importes reportados, nunca como saldos actuales confirmados.
"""
import json
import re
import unicodedata
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.property import Property, PropertyLegal

DATASET_VERSION = "mercer-public-record-review-2026-11-08"

# documentary_flag usa green/yellow/red únicamente como indicador visual
# provisional. En esta carga solo se asigna yellow cuando hay una advertencia
# concreta; nunca se asigna green por ausencia de hallazgos.
FINDINGS = [
    {
        "address": "124 ALBEMARLE AVENUE", "flag": "yellow", "status": "provisional",
        "summary": "Antecedentes de foreclosure y gravamen municipal de alcantarillado. Los expedientes tienen referencias distintas y sus resultados/saldos actuales no están confirmados.",
        "evidence": [
            {"type": "foreclosure", "title": "Wells Fargo Bank, N.A. — expediente de foreclosure", "source": "Mercer County Sheriff foreclosure sale report", "reference": "F-004479-25 / 25003605", "date": "2026-02-04", "reported_amount": 364161.17, "currency": "USD", "note": "Importe reclamado publicado; no es saldo actual certificado ni resultado definitivo de la venta."},
            {"type": "foreclosure_listing", "title": "Otra publicación de subasta", "source": "Auction.com", "reference": "22-06104-FC01", "date": "2027-01-06", "reported_amount": None, "currency": "USD", "note": "Referencia distinta del expediente anterior. No se asume que sean el mismo procedimiento."},
            {"type": "municipal_lien", "title": "Certificado municipal de alcantarillado", "source": "Ewing Township historical sewer lien report", "reference": "24-00127 · Block 80 / Lot 282", "date": "2025-01-13", "reported_amount": 155.84, "currency": "USD", "note": "Importe histórico informado: principal 150 + interés 5.84."},
            {"type": "municipal_lien", "title": "Importe posterior en anuncio de tax sale", "source": "Ewing Township tax sale notice", "reference": "Block 80 / Lot 282", "date": "2025-11", "reported_amount": 195.96, "currency": "USD", "note": "Importe de otro documento/fecha. No sumar con el certificado anterior ni tratarlo como saldo vigente."}
        ]
    },
    {
        "address": "114 MERCER STREET", "flag": "yellow", "status": "provisional",
        "summary": "Se localizó un expediente de foreclosure de Citizens Bank. El informe de agosto de 2026 lo mostraba programado, pero no se confirmó el desenlace en el informe posterior consultado.",
        "evidence": [
            {"type": "foreclosure", "title": "Citizens Bank, N.A. — expediente de foreclosure", "source": "Mercer County Sheriff foreclosure sale report", "reference": "F-011517-24 / 26000082", "date": "2026-05-13", "reported_amount": 57751.68, "currency": "USD", "note": "Importe reclamado publicado. Figuraba Scheduled en el informe del 2026-08-19; no se confirmó resultado posterior hasta el informe consultado del 2026-09-16."}
        ]
    },
    {
        "address": "84 LAMBERTVILLE HOPEWELL ROAD", "flag": "yellow", "status": "provisional",
        "summary": "Se localizó un expediente de foreclosure de Newrez LLC / Shellpoint y referencias inmobiliarias que describían el inmueble como foreclosure/REO. No se confirmó la escritura ni la titularidad actual.",
        "evidence": [
            {"type": "foreclosure", "title": "Newrez LLC / Shellpoint Mortgage Servicing — expediente de foreclosure", "source": "Mercer County Sheriff foreclosure sale report", "reference": "F-000164-25", "date": "2026-02-04", "reported_amount": 315019.78, "currency": "USD", "note": "Importe reclamado publicado; la venta programada no demuestra por sí sola el resultado ni el saldo vigente."},
            {"type": "reo_listing", "title": "Referencias inmobiliarias de foreclosure / bank-owned (REO)", "source": "Public MLS / Redfin listing history", "reference": "Tax ID 06-00005-00016", "date": "2026-10-14", "reported_amount": None, "currency": "USD", "note": "La publicación MLS fue retirada. No equivale a una escritura registrada ni confirma por sí sola la titularidad bancaria."}
        ]
    },
    {
        "address": "4216 NOTTINGHAM WAY", "flag": "yellow", "status": "provisional",
        "summary": "La propiedad figura ocupada en los datos de ClearBid. Un mensaje hipotecario histórico mencionaba USD 276,363, cifra idéntica al precio de apertura; se excluye como deuda confirmada.",
        "evidence": [
            {"type": "occupancy", "title": "Estado de ocupación registrado", "source": "ClearBid property data", "reference": "Property ID 11 · OCCUPIED_PROPERTY", "date": "2026-11-08", "reported_amount": None, "currency": "USD", "note": "Ocupación marcada como occupied. Requiere considerar el proceso de posesión."},
            {"type": "unverified_legacy_message", "title": "Mensaje hipotecario histórico no verificado", "source": "Legacy ClearBid rule result", "reference": "MORTGAGE_ACTIVE / CrossCountry Mortgage", "date": "2026-10-19", "reported_amount": 276363, "currency": "USD", "note": "Coincide exactamente con opening_price. No se carga como hipoteca ni como saldo: dato excluido de la clasificación."}
        ]
    },
    {
        "address": "183 HOLLOW BROOK ROAD", "flag": None, "status": "needs_review",
        "summary": "Hay un antecedente municipal para Block 548 / Lot 1, pero el documento usa la dirección 183 Hollowbrook Drive. La coincidencia con esta propiedad no está confirmada; no se asigna color.",
        "evidence": [
            {"type": "municipal_lien", "title": "Certificado histórico de alcantarillado", "source": "Ewing Township historical sewer lien report", "reference": "19-647 · Block 548 / Lot 1", "date": "2019-12-30", "reported_amount": 230.77, "currency": "USD", "note": "El informe histórico de febrero de 2020 mostraba este importe. La dirección del registro no coincide exactamente."},
            {"type": "municipal_lien", "title": "Importe en resumen histórico posterior", "source": "Ewing Township historical report", "reference": "Block 548 / Lot 1", "date": None, "reported_amount": 1019.52, "currency": "USD", "note": "Documento de otra fecha; no sumar ni tratar como saldo vigente."},
            {"type": "municipal_lien", "title": "Referencia en anuncio de tax sale", "source": "Ewing Township tax sale notice", "reference": "Block 548 / Lot 1", "date": "2025-11", "reported_amount": 195.96, "currency": "USD", "note": "Importe de otro documento/fecha. Requiere confirmar identidad de parcela y redención."}
        ]
    },
    {
        "address": "2465 PENNINGTON ROAD", "flag": None, "status": "needs_review",
        "summary": "Se identificó un certificado municipal de 2018 como redimido en 2020 y otro antecedente de 2013 cuyo estado final no está confirmado. No se considera deuda actual confirmada.",
        "evidence": [
            {"type": "tax_lien_certificate", "title": "Certificado municipal 18-0016", "source": "Mercer County / municipal tax certificate history", "reference": "Block 87 / Lot 3", "date": "2020-05-13", "reported_amount": None, "currency": "USD", "note": "Figura como redimido. No debe contarse como gravamen vigente."},
            {"type": "tax_lien_certificate", "title": "Certificado anterior", "source": "Historical tax certificate record", "reference": "Block 87 / Lot 3 · 2013", "date": "2013", "reported_amount": None, "currency": "USD", "note": "No se pudo establecer el estado final con la información disponible."}
        ]
    },
    {"address": "11 TRENT STREET", "flag": None, "status": "insufficient_data", "summary": "No se encontró evidencia documental suficiente en la revisión disponible para asignar un nivel de riesgo. Esto no significa que la propiedad esté libre de gravámenes.", "evidence": []},
    {"address": "229 MOUNT LUCAS ROAD", "flag": None, "status": "insufficient_data", "summary": "No se encontró evidencia documental suficiente en la revisión disponible para asignar un nivel de riesgo. Esto no significa que la propiedad esté libre de gravámenes.", "evidence": []},
    {"address": "739 WILLIAM STREET", "flag": None, "status": "insufficient_data", "summary": "No se encontró evidencia documental suficiente en la revisión disponible para asignar un nivel de riesgo. Esto no significa que la propiedad esté libre de gravámenes.", "evidence": []},
    {"address": "74 LOUISE LANE", "flag": None, "status": "insufficient_data", "summary": "No se encontró evidencia documental suficiente en la revisión disponible para asignar un nivel de riesgo. Esto no significa que la propiedad esté libre de gravámenes.", "evidence": []},
    {"address": "99 WEST STREET", "flag": None, "status": "insufficient_data", "summary": "No se encontró evidencia documental suficiente en la revisión disponible para asignar un nivel de riesgo. Esto no significa que la propiedad esté libre de gravámenes.", "evidence": []},
]

def normalize_address(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode().upper()
    value = re.sub(r"[^A-Z0-9]+", " ", value)
    return " ".join(value.split())

def address_matches(actual: str, expected: str) -> bool:
    a, e = normalize_address(actual), normalize_address(expected)
    return a == e or a.startswith(e + " ") or e.startswith(a + " ")

async def apply_documentary_findings(db: AsyncSession) -> tuple[int, list[str]]:
    """Carga las 11 fichas por dirección, sin tocar deudas ni campos legales fuente."""
    properties = (await db.execute(select(Property).where(Property.archived.is_(False)))).scalars().all()
    applied = 0
    missing: list[str] = []
    now = datetime.now(timezone.utc)
    for finding in FINDINGS:
        matches = [p for p in properties if address_matches(p.address, finding["address"])]
        if len(matches) != 1:
            missing.append(f"{finding['address']}: {len(matches)} coincidencias")
            continue
        prop = matches[0]
        legal = await db.get(PropertyLegal, prop.id)
        if legal is None:
            legal = PropertyLegal(property_id=prop.id)
            db.add(legal)
        evidence_json = json.dumps({"dataset_version": DATASET_VERSION, "items": finding["evidence"]}, ensure_ascii=False)
        changed = (
            legal.documentary_flag != finding["flag"]
            or legal.documentary_status != finding["status"]
            or legal.documentary_summary != finding["summary"]
            or legal.documentary_evidence != evidence_json
        )
        legal.documentary_flag = finding["flag"]
        legal.documentary_status = finding["status"]
        legal.documentary_summary = finding["summary"]
        legal.documentary_evidence = evidence_json
        if changed or legal.documentary_updated_at is None:
            legal.documentary_updated_at = now
        applied += 1
    return applied, missing
