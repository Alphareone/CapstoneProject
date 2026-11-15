import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import FlagPill from "@/components/ui/FlagPill";
import Spinner from "@/components/ui/Spinner";
import { useProperty } from "@/hooks/useProperties";
import { useSavedIds, useToggleSaved } from "@/hooks/useSaved";
import { AUC_LBL, fdate, flagShort, money, roiText, TYPE_LBL } from "@/lib/format";
import { useToast } from "@/store/toast";
import type { PropertyDetail, RuleResult } from "@/types/api";

type Tab = "fin" | "leg" | "fis" | "sem";
const SEVERITY_COLOR: Record<string, string> = {
  info: "#1A5C2E",
  warning: "#7A4800",
  critical: "#8B1A1A",
};

interface AiPrediction {
  score: number;
  verdict: "STRONG BUY" | "MODERATE / CAUTION" | "HIGH RISK / AVOID";
  verdictColor: string;
  aiMaxBid: number;
  confidence: number;
  reasons: string[];
}

function computeAiPrediction(p: PropertyDetail): AiPrediction {
  let score = 68;
  const reasons: string[] = [];

  const opening = p.financial.opening_price ?? 0;
  const arv = p.financial.arv ?? 0;
  const repairs = p.financial.estimated_repairs ?? 0;
  const roi = p.financial.estimated_roi ?? 0;
  const liens = p.financial.total_liens ?? 0;

  // 1. Análisis financiero (spread y ROI)
  const netMargin = arv - opening - repairs - (p.financial.total_liens_verified ? liens : 0);
  if (roi >= 0.25) {
    score += 14;
    reasons.push(`Retorno proyectado atractivo (${(roi * 100).toFixed(1)}% ROI neto estimado).`);
  } else if (roi >= 0.15) {
    score += 6;
    reasons.push(`Margen financiero moderado (${(roi * 100).toFixed(1)}% ROI estimado).`);
  } else {
    score -= 10;
    reasons.push("Margen estrecho entre precio de apertura, reparaciones y ARV.");
  }

  // 2. Impacto del semáforo de riesgo legal
  if (p.flag === "green") {
    score += 18;
    reasons.push("Sin alertas legales críticas ni gravámenes sobrevivientes detectados.");
  } else if (p.flag === "yellow") {
    score -= 12;
    reasons.push("Presenta advertencias legales/documentales que requieren revisión previa.");
  } else if (p.flag === "red") {
    score -= 36;
    reasons.push("Riesgo crítico activo en motor legal (posible gravamen senior o título comprometido).");
  } else {
    score -= 8;
    reasons.push("Evaluación legal incompleta; se recomienda verificar registro de título.");
  }

  // 3. Ocupación y condición física
  if (p.legal.occupancy === "vacant") {
    score += 5;
    reasons.push("Propiedad desocupada: reduce costos y tiempos de toma de posesión.");
  } else if (p.legal.occupancy === "occupied") {
    score -= 7;
    reasons.push("Inmueble ocupado: considerar costos legales de desalojo.");
  }

  if (p.physical.condition === "good") {
    score += 4;
  } else if (p.physical.condition === "needs_work" || p.physical.condition === "poor") {
    score -= 5;
    reasons.push("Requiere rehabilitación física significativa antes de reventa.");
  }

  score = Math.max(8, Math.min(96, Math.round(score)));

  // Fórmula conservadora de puja máxima IA (70% regla ARV ajustada por riesgo)
  const riskFactor = p.flag === "green" ? 0.72 : p.flag === "yellow" ? 0.65 : 0.55;
  const rawMaxBid = Math.max(opening, Math.round((arv * riskFactor - repairs) / 500) * 500);
  const aiMaxBid = arv > 0 ? Math.min(rawMaxBid, Math.max(opening, arv - repairs - 15000)) : opening;

  // Confianza según completitud de datos
  const knownFields = [
    p.financial.arv,
    p.financial.opening_price,
    p.legal.title_status,
    p.legal.occupancy,
    p.physical.sqft,
    p.physical.condition,
  ].filter((v) => v !== null && v !== undefined).length;
  const confidence = Math.round(62 + (knownFields / 6) * 33);

  let verdict: AiPrediction["verdict"] = "MODERATE / CAUTION";
  let verdictColor = "#D97706";
  if (score >= 75 && p.flag !== "red") {
    verdict = "STRONG BUY";
    verdictColor = "#16A34A";
  } else if (score < 48 || p.flag === "red") {
    verdict = "HIGH RISK / AVOID";
    verdictColor = "#DC2626";
  }

  if (netMargin > 0 && reasons.length < 3) {
    reasons.push(`Ganancia bruta potencial estimada en ${money(netMargin)}.`);
  }

  return { score, verdict, verdictColor, aiMaxBid, confidence, reasons: reasons.slice(0, 3) };
}

function downloadPropertyReport(p: PropertyDetail, ai: AiPrediction) {
  const rulesHtml = (p.traffic_light?.rules ?? [])
    .map(
      (r) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>${r.title ?? r.code}</strong></td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-transform:uppercase;">${r.status}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${r.message ?? "—"}</td>
      </tr>`
    )
    .join("");

  const evidenceHtml = (p.legal.documentary_evidence ?? [])
    .map(
      (ev) => `
      <li style="margin-bottom:6px;">
        <strong>${ev.title}</strong> (${ev.source}${ev.reference ? ` · ${ev.reference}` : ""})
        ${ev.reported_amount != null ? ` — <strong>${money(ev.reported_amount)}</strong>` : ""}
        ${ev.note ? `<br/><span style="color:#4b5563;font-size:12px;">${ev.note}</span>` : ""}
      </li>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>ClearBid NJ — Auction Due Diligence Report (${p.address})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 32px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 12px; background: #f3f4f6; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .card-label { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
    .card-val { font-size: 18px; font-weight: 800; margin-top: 4px; }
    h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.04em; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .ai-box { background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid ${ai.verdictColor}; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
    @media print { .no-print { display: none; } body { margin: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:12px;font-weight:700;color:#4f46e5;">CLEARBID NJ · AUCTION DUE DILIGENCE REPORT</div>
      <h1 style="margin:4px 0 2px;font-size:22px;">${p.address}</h1>
      <div style="color:#4b5563;font-size:14px;">${p.city}, NJ ${p.zip} · Case: ${p.legal.case_number ?? "N/A"}</div>
    </div>
    <div style="text-align:right;">
      <span class="badge">RISK FLAG: ${(p.flag ?? "PENDING").toUpperCase()}</span>
      <div style="font-size:11px;color:#6b7280;margin-top:6px;">Generated: ${new Date().toLocaleString()}</div>
      <button class="no-print" onclick="window.print()" style="margin-top:8px;padding:6px 12px;background:#111827;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Print / Save as PDF</button>
    </div>
  </div>

  <div class="ai-box">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <strong>AI VIABILITY PREDICTION: <span style="color:${ai.verdictColor};">${ai.verdict}</span></strong>
      <strong>Viability Score: ${ai.score}/100 (Confidence: ${ai.confidence}%)</strong>
    </div>
    <p style="margin:8px 0 6px;font-size:13px;"><strong>AI Recommended Max Bid:</strong> ${money(ai.aiMaxBid)}</p>
    <ul style="margin:0;padding-left:18px;font-size:13px;color:#374151;">
      ${ai.reasons.map((r) => `<li>${r}</li>`).join("")}
    </ul>
  </div>

  <h2>1. Financial & Valuation Summary</h2>
  <div class="grid">
    <div class="card"><div class="card-label">Opening Bid</div><div class="card-val">${money(p.financial.opening_price)}</div></div>
    <div class="card"><div class="card-label">After-Repair Value (ARV)</div><div class="card-val">${money(p.financial.arv)}</div></div>
    <div class="card"><div class="card-label">Estimated ROI</div><div class="card-val">${roiText(p.financial.estimated_roi)}</div></div>
    <div class="card"><div class="card-label">Estimated Repairs</div><div class="card-val">${money(p.financial.estimated_repairs)}</div></div>
    <div class="card"><div class="card-label">Reported Liens</div><div class="card-val">${money(p.financial.total_liens)} ${p.financial.total_liens_verified ? "(Verified)" : "(Unverified)"}</div></div>
    <div class="card"><div class="card-label">Potential Profit</div><div class="card-val">${money(p.financial.potential_profit)}</div></div>
  </div>

  <h2>2. Legal & Physical Profile</h2>
  <table>
    <tr>
      <td style="padding:6px 0;"><strong>Auction Type:</strong> ${p.legal.auction_type ? AUC_LBL[p.legal.auction_type] : "—"}</td>
      <td style="padding:6px 0;"><strong>Auction Date:</strong> ${fdate(p.legal.auction_date)}</td>
      <td style="padding:6px 0;"><strong>Property Type:</strong> ${p.property_type ? TYPE_LBL[p.property_type] : "—"}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;"><strong>Title Status:</strong> ${p.legal.title_status ?? "—"}</td>
      <td style="padding:6px 0;"><strong>Occupancy:</strong> ${p.legal.occupancy ?? "—"}</td>
      <td style="padding:6px 0;"><strong>Area / Beds / Baths:</strong> ${p.physical.sqft ?? "—"} sqft · ${p.physical.beds ?? "—"} bd / ${p.physical.baths ?? "—"} ba</td>
    </tr>
    <tr>
      <td style="padding:6px 0;"><strong>Surviving IRS Lien:</strong> ${money(p.legal.surviving_irs_lien)}</td>
      <td style="padding:6px 0;"><strong>Senior Liens:</strong> ${money(p.legal.senior_liens)}</td>
      <td style="padding:6px 0;"><strong>Condition / Year:</strong> ${p.physical.condition ?? "—"} (${p.physical.year_built ?? "—"})</td>
    </tr>
  </table>

  ${
    p.legal.documentary_summary
      ? `<h2>3. Documentary Public Record Findings</h2>
         <p style="font-size:13px;">${p.legal.documentary_summary}</p>
         ${evidenceHtml ? `<ul style="font-size:13px;">${evidenceHtml}</ul>` : ""}`
      : ""
  }

  <h2>4. Traffic-Light Risk Engine Rules (v${p.traffic_light?.engine_version ?? "2.5"})</h2>
  <table>
    <thead>
      <tr style="background:#f9fafb;text-align:left;">
        <th style="padding:8px;border-bottom:1px solid #d1d5db;">Rule</th>
        <th style="padding:8px;border-bottom:1px solid #d1d5db;">Status</th>
        <th style="padding:8px;border-bottom:1px solid #d1d5db;">Assessment</th>
      </tr>
    </thead>
    <tbody>
      ${rulesHtml || `<tr><td colspan="3" style="padding:8px;">No rule evaluations recorded.</td></tr>`}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = p.address.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  a.href = url;
  a.download = `ClearBid-Report-${slug}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DetailDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast((s) => s.show);
  const [tab, setTab] = useState<Tab>("fin");
  const { data: p, isLoading } = useProperty(id);
  const { ids } = useSavedIds();
  const toggleSaved = useToggleSaved();

  const open = !!id;
  const isSaved = id ? ids.has(id) : false;

  const ai = useMemo(() => (p ? computeAiPrediction(p) : null), [p]);

  async function save() {
    if (!id) return;
    await toggleSaved.mutateAsync({ id, saved: isSaved });
    toast(isSaved ? t("removed_saved") : t("saved_toast"));
  }

  function handleDownloadReport() {
    if (!p || !ai) return;
    downloadPropertyReport(p, ai);
    toast("Informe descargado correctamente");
  }

  const KV = ({ k, v, color }: { k: string; v: string; color?: string }) => (
    <div className="flex items-center justify-between border-b border-line2 py-[9px] text-[13.5px]">
      <span className="text-ink2">{k}</span>
      <span className="font-semibold" style={color ? { color } : undefined}>
        {v}
      </span>
    </div>
  );

  const TABS: [Tab, string][] = [
    ["fin", "d_fin"],
    ["leg", "d_leg"],
    ["fis", "d_fis"],
    ["sem", "d_sem"],
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-[440px] max-w-[92vw] flex-col bg-paper shadow-[-12px_0_40px_rgba(0,0,0,.2)] transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {isLoading || !p || !ai ? (
          <Spinner label={t("loading")} />
        ) : (
          <>
            <div className="border-b border-line2 p-[18px_20px]">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold">{p.address}</h2>
                  <div className="text-[13px] text-ink2">
                    {p.city}, NJ {p.zip}
                  </div>
                </div>
                <span className="cursor-pointer text-xl text-ink2" onClick={onClose}>
                  ✕
                </span>
              </div>
              <div className="mt-2">
                <FlagPill flag={p.flag} provisionalFlag={p.legal.documentary_flag} />
              </div>
            </div>

            <div className="flex gap-1 border-b border-line2 px-4 pt-2">
              {TABS.map(([id2, lbl]) => (
                <button
                  key={id2}
                  onClick={() => setTab(id2)}
                  className={`rounded-t-lg px-3 py-2 text-[13px] font-semibold ${
                    tab === id2 ? "border-b-2 border-accent text-ink" : "text-ink2"
                  }`}
                >
                  {t(lbl)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-[16px_20px]">
              {tab === "fin" && (
                <>
                  <div
                    className="mb-3 rounded-xl border border-line2 p-4 text-center"
                    style={{ background: `var(--${flagBg(p.flag)})`, color: "#111827" }}
                  >
                    <div className="text-3xl font-extrabold" style={{ color: flagAccent(p.flag) }}>
                      {roiText(p.financial.estimated_roi)}
                    </div>
                    <div className="text-xs font-medium" style={{ color: "#4B5563" }}>
                      {t("roi_cap")}
                    </div>
                  </div>

                  {/* Prototipo AI Deal Advisor */}
                  <div className="mb-3 rounded-xl border border-line2 bg-wash p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                        ✦ ClearBid AI Predictor
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                        style={{ backgroundColor: ai.verdictColor }}
                      >
                        {ai.verdict}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-baseline justify-between">
                      <div>
                        <div className="text-2xl font-extrabold text-ink">
                          {ai.score}
                          <span className="text-sm font-normal text-ink2">/100</span>
                        </div>
                        <div className="text-[11px] text-ink2">Viability Score · {ai.confidence}% conf.</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-ink">{money(ai.aiMaxBid)}</div>
                        <div className="text-[11px] text-ink2">AI Optimal Max Bid</div>
                      </div>
                    </div>

                    <ul className="mt-2.5 space-y-1 border-t border-line2 pt-2 text-[12px] text-ink2">
                      {ai.reasons.map((reason, idx) => (
                        <li key={idx}>• {reason}</li>
                      ))}
                    </ul>
                  </div>

                  <KV k={t("fin_opening")} v={money(p.financial.opening_price)} />
                  <KV
                    k={t("fin_liens")}
                    v={p.financial.total_liens_verified === true
                      ? money(p.financial.total_liens)
                      : `${money(p.financial.total_liens)} · ${t("not_verified")}`}
                  />
                  <KV k={t("fin_arv")} v={money(p.financial.arv)} />
                  <KV k={t("fin_repairs")} v={money(p.financial.estimated_repairs)} />
                  <KV k={t("fin_maxbid")} v={money(p.financial.suggested_max_bid)} />
                  <KV
                    k={t("fin_profit")}
                    v={money(p.financial.potential_profit)}
                    color={`var(--${(p.financial.potential_profit ?? 0) < 0 ? "red" : "green"})`}
                  />
                </>
              )}
              {tab === "leg" && (
                <>
                  <KV k={t("leg_type")} v={p.legal.auction_type ? AUC_LBL[p.legal.auction_type] : "—"} />
                  <KV k={t("leg_date")} v={fdate(p.legal.auction_date)} />
                  <KV k={t("leg_place")} v={p.legal.location ?? "—"} />
                  <KV k={t("leg_case")} v={p.legal.case_number ?? "—"} />
                  <KV k={t("leg_title")} v={p.legal.title_status ?? "—"} />
                  <KV k={t("leg_occ")} v={p.legal.occupancy ?? "—"} />
                  <KV k={t("leg_deposit")} v={money(p.legal.required_deposit)} />
                  <KV k={t("leg_irs_lien")} v={money(p.legal.surviving_irs_lien)} />
                  <KV k={t("leg_senior_liens")} v={money(p.legal.senior_liens)} />
                  <KV k={t("leg_bankruptcy")} v={p.legal.bankruptcy_indicator === null || p.legal.bankruptcy_indicator === undefined ? "—" : p.legal.bankruptcy_indicator ? t("yes") : t("no")} />
                  <KV k={t("leg_open_permits")} v={p.legal.open_permits_count === null || p.legal.open_permits_count === undefined ? "—" : String(p.legal.open_permits_count)} />
                  <KV k={t("leg_defendants")} v={p.legal.defendant_count === null || p.legal.defendant_count === undefined ? "—" : String(p.legal.defendant_count)} />
                  <KV k={t("leg_ownership")} v={p.legal.ownership_type ?? "—"} />
                  <KV k={t("leg_mortgage")} v={p.legal.mortgage_active === null || p.legal.mortgage_active === undefined ? "—" : p.legal.mortgage_active ? t("yes") : t("no")} />
                  {p.legal.documentary_status && (
                    <section className="mt-4 rounded-xl border border-line2 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <b className="text-sm">{t("documentary_title")}</b>
                        {p.legal.documentary_flag ? (
                          <FlagPill flag={null} provisionalFlag={p.legal.documentary_flag} />
                        ) : (
                          <span className="rounded-full bg-wash px-2 py-1 text-[11px] font-bold text-ink2">
                            {t(`documentary_status_${p.legal.documentary_status}`)}
                          </span>
                        )}
                      </div>
                      <p className="mb-3 text-[12px] leading-5 text-ink2">{p.legal.documentary_summary}</p>
                      {(p.legal.documentary_evidence ?? []).map((item, index) => (
                        <div key={`${item.reference ?? item.title}-${index}`} className="border-t border-line2 py-2 text-[12px]">
                          <b>{item.title}</b>
                          <div className="text-ink2">{item.source}{item.reference ? ` · ${item.reference}` : ""}{item.date ? ` · ${item.date}` : ""}</div>
                          {item.reported_amount !== null && item.reported_amount !== undefined && (
                            <div className="font-semibold">{money(item.reported_amount)} {item.currency ?? ""}</div>
                          )}
                          {item.note && <p className="mt-1 text-ink2">{item.note}</p>}
                        </div>
                      ))}
                      {p.legal.documentary_updated_at && (
                        <div className="mt-2 text-[10px] text-ink2">{t("documentary_updated")}: {fdate(p.legal.documentary_updated_at)}</div>
                      )}
                    </section>
                  )}
                </>
              )}
              {tab === "fis" && (
                <>
                  <KV k={t("fis_type")} v={p.property_type ? TYPE_LBL[p.property_type] : "—"} />
                  <KV k={t("fis_area")} v={p.physical.sqft ? `${p.physical.sqft} sqft` : "—"} />
                  <KV k={t("fis_lot")} v={p.physical.lot_sqft ? `${p.physical.lot_sqft} sqft` : "—"} />
                  <KV k={t("fis_beds")} v={`${p.physical.beds ?? "—"} / ${p.physical.baths ?? "—"}`} />
                  <KV k={t("fis_year")} v={p.physical.year_built ? String(p.physical.year_built) : "—"} />
                  <KV k={t("fis_cond")} v={p.physical.condition ?? "—"} />
                  <div className="mt-3 text-xs font-semibold uppercase text-ink2">{t("fis_loc")}</div>
                  <div className="text-[13px] text-ink2">
                    {p.physical.neighborhood ?? "—"}
                    {p.physical.school_rating ? ` · schools ${p.physical.school_rating}/10` : ""}
                  </div>
                </>
              )}
              {tab === "sem" && (
                <>
                  <div
                    className="mb-3 flex items-start gap-2 rounded-xl p-3"
                    style={{ background: `var(--${flagBg(p.flag)})`, color: "#111827" }}
                  >
                    <i className={`dot ${flagShort(p.flag)} mt-1`} />
                    <b>
                      {flagShort(p.flag) === "g"
                        ? t("flag_g")
                        : flagShort(p.flag) === "a"
                          ? t("flag_a")
                          : flagShort(p.flag) === "r"
                            ? t("flag_r")
                            : t("flag_pending")}
                    </b>
                  </div>
                  {p.flag === null && (
                    <p className="mb-3 text-[13px] text-ink2">
                      {!p.traffic_light
                        ? t("risk_no_result")
                        : p.traffic_light.evaluation_status === "not_configured"
                          ? t("risk_rules_missing")
                          : t("risk_data_incomplete")}
                    </p>
                  )}
                  {p.flag !== null && p.traffic_light?.evaluation_status === "incomplete" && (
                    <p className="mb-3 text-[13px] text-ink2">{t("risk_data_incomplete")}</p>
                  )}
                  {p.legal.documentary_status && (
                    <div className="mb-3 rounded-xl border border-line2 p-3">
                      <b className="text-[13px]">{t("documentary_title")}</b>
                      <p className="mt-1 text-[12px] leading-5 text-ink2">{p.legal.documentary_summary}</p>
                    </div>
                  )}
                  <div className="mb-2 text-xs font-semibold uppercase text-ink2">{t("sem_rules")}</div>
                  {(p.traffic_light?.rules ?? []).map((r: RuleResult, i: number) => (
                    <div key={i} className="mb-2 flex items-start gap-2 text-[13px]">
                      <span
                        className="mt-1 inline-block h-[9px] w-[9px] shrink-0 rounded-full"
                        style={{ background: r.status === "unknown" ? "#777777" : SEVERITY_COLOR[r.severity] }}
                      />
                      <div>
                        <b>{r.title ?? r.code}</b>
                        <br />
                        <span className="text-ink2">
                          {r.status === "unknown"
                            ? t("risk_rule_unknown")
                            : r.status === "pass"
                              ? t("risk_rule_pass")
                              : `${t("risk_rule_fail")}${r.message ?? ""}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="flex gap-2 border-t border-line2 p-4">
              <button className="btn flex-1" onClick={save}>
                {isSaved ? "★ " : "☆ "}
                {t("cta_save")}
              </button>
              <button className="btn btn-ghost flex-1" onClick={handleDownloadReport}>
                ⬇ {t("cta_prepare")}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function flagBg(flag: string | null): string {
  const s = flagShort(flag);
  return s === "g" ? "risk-green-bg"
    : s === "a" ? "risk-amber-bg"
    : s === "r" ? "risk-red-bg"
    : "risk-pending-bg";
}

function flagAccent(flag: string | null): string {
  const s = flagShort(flag);
  return s === "g" ? "#15803D"
    : s === "a" ? "#B45309"
    : s === "r" ? "#B91C1C"
    : "#374151";
}