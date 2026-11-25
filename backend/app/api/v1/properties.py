"""Módulo 5.4/5.5 — Propiedades, mapa, facetas y semáforo (lectura)."""
from datetime import datetime
import hashlib
import os
import json

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
import httpx
from sqlalchemy import distinct, func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import errors
from app.core.deps import get_current_user
from app.core.pagination import Page, PageParams
from app.db.session import get_db
from app.models.geography import County
from app.models.property import (
    Property,
    PropertyDocument,
    PropertyFinancial,
    PropertyLegal,
)
from app.models.rules import RuleResult, TrafficLightResult
from app.models.user import User
from app.schemas.property import (
    DocumentItem,
    DocumentList,
    FinancialBlock,
    GeoFeature,
    GeoFeatureCollection,
    LegalBlock,
    PhysicalBlock,
    PropertyDetail,
    PropertyListItem,
    RuleResultOut,
    TrafficLightOut,
)
from app.schemas.web import FacetsResponse
from app.services import query as q

router = APIRouter(prefix="/properties", tags=["Propiedades"])

# Valores base de mercado (ARV) por código postal de Mercer County (NJ)
_MERCER_ZIP_ARV: dict[str, int] = {
    "08540": 520000,  # Princeton
    "08534": 460000,  # Pennington
    "08525": 430000,  # Hopewell
    "08690": 340000,  # Hamilton
    "08638": 295000,  # Ewing
    "08628": 325000,  # Ewing / West Trenton
    "08618": 245000,  # Trenton / Ewing border
    "08610": 230000,  # Trenton / Hamilton
    "08611": 185000,  # Trenton
    "08601": 195000,  # Trenton
}

_HOUSE_PHOTOS = [
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1598228723793-52759bba239c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
]


def _pick_photo(prop_id: str, existing: str | None) -> str:
    if existing and existing.startswith("http"):
        return existing
    idx = int(hashlib.md5(prop_id.encode("utf-8")).hexdigest()[:6], 16) % len(_HOUSE_PHOTOS)
    return _HOUSE_PHOTOS[idx]


def _seed_factor(prop_id: str) -> float:
    """Genera una variación determinista (-12% a +14%) por propiedad."""
    digest = int(hashlib.md5(prop_id.encode("utf-8")).hexdigest()[:6], 16)
    return 0.88 + (digest % 27) * 0.01


def _derive_financials(
    p: Property,
) -> tuple[int | None, int | None, int | None, float | None, int | None, int | None]:
    """Devuelve (opening, arv, repairs, roi%, net_profit, max_bid) reales o derivados on-read."""
    fin = p.financial
    factor = _seed_factor(str(p.id))

    base_zip_arv = _MERCER_ZIP_ARV.get(str(p.zip or ""), 280000)
    arv = (fin.arv if (fin and fin.arv and fin.arv > 0) else round((base_zip_arv * factor) / 1000) * 1000)

    eff_flag = p.flag or (p.legal.documentary_flag if p.legal else None)
    if fin and fin.opening_price and fin.opening_price > 0:
        opening = fin.opening_price
    else:
        ratio = 0.82 if eff_flag == "red" else 0.58 if eff_flag == "yellow" else 0.46
        opening = round((arv * ratio) / 1000) * 1000

    sqft = p.physical.sqft if (p.physical and p.physical.sqft) else 1150
    if fin and fin.estimated_repairs is not None and fin.estimated_repairs > 0:
        repairs = fin.estimated_repairs
    else:
        repairs = round((sqft * 22 * factor) / 500) * 500

    liens = (fin.total_liens or 0) if (fin and fin.total_liens_verified) else 0
    total_cost = opening + repairs + liens
    net_profit = round(arv - total_cost)
    real_roi = round((net_profit / total_cost) * 100, 1) if total_cost > 0 else 0.0
    max_bid = max(opening, round((arv * 0.70 - repairs - liens) / 500) * 500)

    return opening, arv, repairs, real_roi, net_profit, max_bid


@router.get(
    "",
    response_model=Page[PropertyListItem],
    summary="Listar oportunidades con filtros, orden y paginación",
    responses={422: {}},
)
async def list_properties(
    county_id: str | None = Query(None),
    zip: str | None = Query(None),
    flag: list[str] | None = Query(None, description="Repetible: green|yellow|red"),
    auction_type: list[str] | None = Query(None, description="Repetible"),
    property_type: list[str] | None = Query(None, description="Repetible"),
    min_opening: int | None = Query(None),
    max_opening: int | None = Query(None),
    min_roi: float | None = Query(None, description="ROI estimado mínimo (%)."),
    auction_from: datetime | None = Query(None),
    auction_to: datetime | None = Query(None),
    q_text: str | None = Query(None, alias="q", description="Texto libre (dirección/ciudad)."),
    sort: str | None = Query(
        None, description="opening_asc|opening_desc|auction_date|roi_desc"
    ),
    page: PageParams = Depends(),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    joined_legal = sort == "auction_date" or bool(auction_type) or auction_from or auction_to

    base = q.apply_filters(
        select(Property).options(
            selectinload(Property.financial),
            selectinload(Property.legal),
            selectinload(Property.physical),
        ),
        county_id=[county_id] if county_id else None,
        zip=zip, flag=flag, auction_type=auction_type, property_type=property_type,
        min_opening=None, max_opening=None, min_roi=None,
        auction_from=auction_from, auction_to=auction_to, q=q_text,
        needs_financial=False, needs_legal=joined_legal,
    )
    stmt = q.apply_sort(base, sort if sort not in {"roi_desc", "opening_asc", "opening_desc"} else None, False)
    all_rows = (await db.execute(stmt)).scalars().unique().all()

    enriched = []
    for p in all_rows:
        opening, arv, _, real_roi, _, _ = _derive_financials(p)
        if min_opening is not None and (opening is None or opening < min_opening):
            continue
        if max_opening is not None and (opening is None or opening > max_opening):
            continue
        if min_roi is not None and (real_roi is None or real_roi < min_roi):
            continue
        enriched.append((p, opening, arv, real_roi))

    if sort == "roi_desc":
        enriched.sort(key=lambda x: x[3] if x[3] is not None else -9999, reverse=True)
    elif sort == "opening_asc":
        enriched.sort(key=lambda x: x[1] if x[1] is not None else 999999999)
    elif sort == "opening_desc":
        enriched.sort(key=lambda x: x[1] if x[1] is not None else -1, reverse=True)

    total = len(enriched)
    sliced = enriched[page.offset : page.offset + page.limit]

    items = [
        PropertyListItem(
            id=p.id, address=p.address, city=p.city, zip=p.zip, county_id=p.county_id,
            property_type=p.property_type, flag=p.flag,
            documentary_flag=p.legal.documentary_flag if p.legal else None,
            opening_price=opening,
            estimated_value=arv,
            estimated_roi=real_roi,
            auction_date=p.legal.auction_date if p.legal else None,
            thumbnail_url=_pick_photo(str(p.id), p.thumbnail_url),
        )
        for p, opening, arv, real_roi in sliced
    ]
    return Page.create(items, total, page)


@router.get(
    "/facets",
    response_model=FacetsResponse,
    summary="Conteos agregados por faceta para el panel de filtros (sección 6.5)",
)
async def facets(
    county_id: str | None = Query(None),
    flag: list[str] | None = Query(None),
    auction_type: list[str] | None = Query(None),
    property_type: list[str] | None = Query(None),
    min_opening: int | None = Query(None),
    max_opening: int | None = Query(None),
    min_roi: float | None = Query(None),
    q_text: str | None = Query(None, alias="q"),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    kw = dict(
        county_id=[county_id] if county_id else None, flag=flag,
        auction_type=auction_type, property_type=property_type,
        min_opening=None, max_opening=None, min_roi=None, q=q_text,
    )
    ids_stmt = q.apply_filters(select(Property.id), **kw)
    ids = [r[0] for r in (await db.execute(ids_stmt)).all()]
    if not ids:
        return FacetsResponse(total=0)

    props = (
        await db.execute(
            select(Property)
            .options(
                selectinload(Property.financial),
                selectinload(Property.legal),
                selectinload(Property.physical),
            )
            .where(Property.id.in_(ids))
        )
    ).scalars().unique().all()

    roi_vals = []
    valid_ids = []
    for p in props:
        opening, _, _, r_roi, _, _ = _derive_financials(p)
        if min_opening is not None and (opening is None or opening < min_opening):
            continue
        if max_opening is not None and (opening is None or opening > max_opening):
            continue
        if r_roi is not None:
            roi_vals.append(r_roi)
        if min_roi is None or (r_roi is not None and r_roi >= min_roi):
            valid_ids.append(p.id)

    total = len(valid_ids)
    if not valid_ids:
        return FacetsResponse(total=0)

    flag_rows = (
        await db.execute(
            select(func.coalesce(Property.flag, PropertyLegal.documentary_flag), func.count())
            .outerjoin(PropertyLegal, PropertyLegal.property_id == Property.id)
            .where(Property.id.in_(valid_ids))
            .group_by(func.coalesce(Property.flag, PropertyLegal.documentary_flag))
        )
    ).all()
    ptype_rows = (
        await db.execute(
            select(Property.property_type, func.count())
            .where(Property.id.in_(valid_ids)).group_by(Property.property_type)
        )
    ).all()
    county_rows = (
        await db.execute(
            select(County.id, County.name, func.count())
            .join(Property, Property.county_id == County.id)
            .where(Property.id.in_(valid_ids)).group_by(County.id, County.name)
        )
    ).all()
    at_rows = (
        await db.execute(
            select(PropertyLegal.auction_type, func.count())
            .where(PropertyLegal.property_id.in_(valid_ids))
            .group_by(PropertyLegal.auction_type)
        )
    ).all()

    buckets = [
        {"gte": t, "count": sum(1 for v in roi_vals if v >= t)} for t in (100, 35, 15)
    ]
    return FacetsResponse(
        total=total,
        flag={k: v for k, v in flag_rows if k},
        county=[{"county_id": cid, "name": name, "count": c} for cid, name, c in county_rows],
        auction_type={k: v for k, v in at_rows if k},
        property_type={k: v for k, v in ptype_rows if k},
        roi_buckets=buckets,
    )


@router.get(
    "/map",
    response_model=GeoFeatureCollection,
    summary="Puntos para el mapa (GeoJSON FeatureCollection)",
)
async def properties_map(
    county_id: str | None = Query(None),
    bbox: str | None = Query(None, description="minLng,minLat,maxLng,maxLat"),
    flag: list[str] | None = Query(None),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.property import PropertyPhysical

    stmt = (
        select(Property, PropertyPhysical, PropertyFinancial, PropertyLegal)
        .join(PropertyPhysical, PropertyPhysical.property_id == Property.id)
        .outerjoin(PropertyFinancial, PropertyFinancial.property_id == Property.id)
        .outerjoin(PropertyLegal, PropertyLegal.property_id == Property.id)
        .where(Property.archived.is_(False))
    )
    if county_id:
        stmt = stmt.where(Property.county_id == county_id)
    if flag:
        from sqlalchemy import or_, and_
        stmt = stmt.where(or_(Property.flag.in_(flag), and_(Property.flag.is_(None), PropertyLegal.documentary_flag.in_(flag))))
    if bbox:
        try:
            min_lng, min_lat, max_lng, max_lat = map(float, bbox.split(","))
        except ValueError:
            raise errors.unprocessable("bbox debe ser 'minLng,minLat,maxLng,maxLat'.")
        stmt = stmt.where(
            PropertyPhysical.lng.between(min_lng, max_lng),
            PropertyPhysical.lat.between(min_lat, max_lat),
        )

    features = []
    for p, phys, fin, legal in (await db.execute(stmt)).all():
        if phys.lat is None or phys.lng is None:
            continue
        p.financial = fin
        p.legal = legal
        p.physical = phys
        opening, _, _, _, _, _ = _derive_financials(p)
        features.append(
            GeoFeature(
                geometry={"type": "Point", "coordinates": [phys.lng, phys.lat]},
                properties={
                    "id": p.id, "flag": p.flag or (legal.documentary_flag if legal else None),
                    "provisional": p.flag is None and bool(legal and legal.documentary_flag),
                    "opening_price": opening,
                },
            )
        )
    return GeoFeatureCollection(features=features)


async def _load_full(db: AsyncSession, property_id: str) -> Property | None:
    return (
        await db.execute(
            select(Property)
            .options(
                selectinload(Property.financial),
                selectinload(Property.legal),
                selectinload(Property.physical),
            )
            .where(Property.id == property_id, Property.archived.is_(False))
        )
    ).scalar_one_or_none()


async def _traffic_light_out(db: AsyncSession, property_id: str) -> TrafficLightOut | None:
    res = await db.get(TrafficLightResult, property_id)
    if res is None:
        return None
    rules = (
        await db.execute(
            select(RuleResult).where(RuleResult.property_id == property_id)
        )
    ).scalars().all()
    return TrafficLightOut(
        flag=res.flag, evaluation_status=res.evaluation_status,
        engine_version=res.engine_version, generated_at=res.generated_at,
        rules=[
            RuleResultOut(
                code=r.rule_code, status=r.status, severity=r.severity,
                title=r.title, message=r.message,
            )
            for r in rules
        ],
    )


@router.get(
    "/{property_id}",
    response_model=PropertyDetail,
    summary="Ficha de detalle completa (financiero, legal, físico y semáforo)",
    responses={404: {}},
)
async def get_property(
    property_id: str, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    p = await _load_full(db, property_id)
    if p is None:
        raise errors.not_found("Propiedad inexistente.")

    raw_photos = json.loads(p.photos) if isinstance(p.photos, str) else (p.photos or [])
    photos = raw_photos if raw_photos else [_pick_photo(str(p.id), p.thumbnail_url)]

    if p.legal:
        legal_data = {column.name: getattr(p.legal, column.name) for column in p.legal.__table__.columns}
        try:
            payload = json.loads(legal_data.get("documentary_evidence") or "{}")
            legal_data["documentary_evidence"] = payload.get("items", [])
        except (ValueError, TypeError):
            legal_data["documentary_evidence"] = []
        legal_block = LegalBlock.model_validate(legal_data)
    else:
        legal_block = LegalBlock()

    fin_block = FinancialBlock.model_validate(p.financial, from_attributes=True) if p.financial else FinancialBlock()
    opening, arv, repairs, real_roi, net_profit, max_bid = _derive_financials(p)
    fin_block.opening_price = opening
    fin_block.arv = arv
    fin_block.estimated_repairs = repairs
    fin_block.estimated_roi = real_roi
    fin_block.potential_profit = net_profit
    fin_block.suggested_max_bid = max_bid

    return PropertyDetail(
        id=p.id, address=p.address, city=p.city, zip=p.zip, county_id=p.county_id,
        property_type=p.property_type, flag=p.flag, photos=photos,
        financial=fin_block,
        legal=legal_block,
        physical=PhysicalBlock.model_validate(p.physical, from_attributes=True)
        if p.physical else PhysicalBlock(),
        traffic_light=await _traffic_light_out(db, property_id),
    )


@router.get(
    "/{property_id}/documents",
    response_model=DocumentList,
    summary="Documentos del caso asociados a la propiedad",
    responses={404: {}},
)
async def property_documents(
    property_id: str, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    if await db.get(Property, property_id) is None:
        raise errors.not_found("Propiedad inexistente.")
    docs = (
        await db.execute(
            select(PropertyDocument).where(PropertyDocument.property_id == property_id)
        )
    ).scalars().all()
    return DocumentList(items=[DocumentItem.model_validate(d) for d in docs])


@router.get(
    "/{property_id}/traffic-light",
    response_model=TrafficLightOut,
    summary="Color y reglas evaluadas de una propiedad (pestaña Semáforo)",
    responses={404: {}},
)
async def property_traffic_light(
    property_id: str, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    if await db.get(Property, property_id) is None:
        raise errors.not_found("Propiedad inexistente.")
    out = await _traffic_light_out(db, property_id)
    if out is None:
        raise errors.not_found("Semáforo no calculado para esta propiedad.")
    return out


class AIPredictionRequest(BaseModel):
    property_data: dict


@router.post("/ai-advisor")
async def get_ai_advisor(payload: AIPredictionRequest):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Falta GROQ_API_KEY en Render")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    prompt = f"""Eres ClearBid AI, motor de inteligencia de registros públicos para subastas judiciales (Sheriff Sales) en Mercer County, New Jersey (N.J.S.A. 2A:50-64).
Analiza los datos reales de la propiedad (ARV, opening_price, estimated_repairs, estimated_roi, ocupación, flag, documentary_flag y traffic_light) y devuelve estrictamente un JSON válido con esta estructura exacta:
{{
    "score": <numero entero entre 0 y 100 indicando viabilidad de due diligence>,
    "verdict": "<'STRONG BUY' si flag es green y ROI neto > 25%, 'MODERATE / CAUTION' si hay alertas provisionales o margen ajustado, 'HIGH RISK / AVOID' si flag o documentary_flag es red o hay gravámenes críticos>",
    "verdictColor": "<'#16A34A' para STRONG BUY, '#D97706' para MODERATE, '#DC2626' para HIGH RISK>",
    "aiMaxBid": <numero entero con la puja máxima matemática recomendada descontando reparaciones, 20% depósito estatutario y riesgo>,
    "confidence": <numero entero entre 0 y 100 basado en completitud de datos verificados>,
    "reasons": [<arreglo con exactamente 3 strings cortos en español, máximo 14 palabras cada uno, citando cifras reales o reglas de Mercer County como gravámenes IRS, ocupación o spread neto>]
}}

Datos de la propiedad:
{json.dumps(payload.property_data, default=str)}"""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            models_res = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers=headers,
            )
            if models_res.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Groq models error: {models_res.text}")

            available = [
                m["id"]
                for m in models_res.json().get("data", [])
                if not any(bad in m["id"].lower() for bad in ("whisper", "guard", "tts", "embed"))
            ]
            if not available:
                raise HTTPException(status_code=500, detail="No hay modelos de texto activos en Groq")

            preferred = [
                "llama-3.1-8b-instant",
                "openai/gpt-oss-120b",
                "openai/gpt-oss-20b",
                "qwen/qwen3-32b",
            ]
            selected_model = next((m for m in preferred if m in available), available[0])

            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json={
                    "model": selected_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2,
                },
            )
            if res.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Groq error ({selected_model}): {res.text}")

            content = res.json()["choices"][0]["message"]["content"]
            return json.loads(content)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))