import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import FlagPill from "@/components/ui/FlagPill";
import Spinner from "@/components/ui/Spinner";
import { useProperty } from "@/hooks/useProperties";
import { useSavedIds, useToggleSaved } from "@/hooks/useSaved";
import { api } from "@/lib/api";
import { AUC_LBL, fdate, flagShort, money, roiText, TYPE_LBL } from "@/lib/format";
import { downloadPropertyDossierPdf } from "@/lib/pdfDossier";
import { getRealStreetViewPhoto } from "@/lib/propertyPhotos";
import { useAuth } from "@/store/auth";
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

function roiVisualStyle(roi: number | null | undefined, flag: string | null) {
  if (roi === null || roi === undefined) {
    return { bg: "var(--risk-pending-bg)", accent: "#374151" };
  }
  if (flag === "red" || roi < 10) {
    return { bg: "var(--risk-red-bg)", accent: "#B91C1C" };
  }
  if (roi < 25 || flag === "yellow") {
    return { bg: "var(--risk-amber-bg)", accent: "#B45309" };
  }
  return { bg: "var(--risk-green-bg)", accent: "#15803D" };
}

function computeAiPrediction(p: PropertyDetail, isEs: boolean): AiPrediction {
  let score = 58;
  const reasons: string[] = [];

  const opening = p.financial.opening_price ?? 0;
  const arv = p.financial.arv ?? 0;
  const repairs = p.financial.estimated_repairs ?? 0;
  const roi = p.financial.estimated_roi ?? 0;
  const liens = p.financial.total_liens ?? 0;

  const effectiveFlag = p.flag ?? p.legal.documentary_flag ?? null;
  const netMargin = arv - opening - repairs - (p.financial.total_liens_verified ? liens : 0);

  if (roi >= 35) {
    score += 12;
    reasons.push(
      isEs
        ? `Retorno proyectado sólido (${roi.toFixed(1)}% ROI neto estimado tras reparaciones).`
        : `Strong projected spread (${roi.toFixed(1)}% estimated net ROI after rehab).`
    );
  } else if (roi >= 20) {
    score += 7;
    reasons.push(
      isEs
        ? `Margen financiero moderado (${roi.toFixed(1)}% ROI estimado).`
        : `Moderate financial spread (${roi.toFixed(1)}% estimated net ROI).`
    );
  } else {
    score -= 10;
    reasons.push(
      isEs
        ? `ROI neto (${roi.toFixed(1)}%) ajustado para el riesgo de subasta AS-IS.`
        : `Net ROI (${roi.toFixed(1)}%) is tight for an AS-IS sheriff auction.`
    );
  }

  if (effectiveFlag === "green") {
    score += 11;
    reasons.push(
      isEs
        ? "Sin alertas legales críticas ni gravámenes sobrevivientes detectados."
        : "No critical legal alerts or surviving senior liens detected."
    );
  } else if (effectiveFlag === "yellow") {
    score -= 4;
    reasons.push(
      isEs
        ? "Presenta advertencias documentales que requieren verificación de título."
        : "Shows documentary warnings requiring pre-bid title verification."
    );
  } else if (effectiveFlag === "red") {
    score -= 26;
    reasons.push(
      isEs
        ? "Riesgo crítico activo en motor legal (posible gravamen senior o defecto de título)."
        : "Active critical legal risk (potential senior lien or title defect)."
    );
  } else {
    score -= 14;
    reasons.push(
      isEs
        ? "Expediente legal incompleto; requiere búsqueda independiente de gravámenes."
        : "Incomplete legal docket; independent municipal & title search required."
    );
  }

  if (p.legal.occupancy === "vacant") {
    score += 3;
    reasons.push(
      isEs
        ? "Propiedad desocupada: reduce tiempos y costos legales de posesión."
        : "Vacant property: reduces post-auction possession timeline and legal fees."
    );
  } else if (p.legal.occupancy === "occupied") {
    score -= 6;
    reasons.push(
      isEs
        ? "Inmueble ocupado: contemplar proceso de desalojo en Nueva Jersey."
        : "Occupied property: factor in NJ ejectment timeline and legal costs."
    );
  } else {
    score -= 2;
  }

  if (!p.financial.total_liens_verified) {
    score -= 3;
  }

  score = Math.max(18, Math.min(86, Math.round(score)));

  const riskFactor = effectiveFlag === "green" ? 0.72 : effectiveFlag === "yellow" ? 0.65 : 0.55;
  const rawMaxBid = Math.max(opening, Math.round((arv * riskFactor - repairs) / 500) * 500);
  const aiMaxBid = arv > 0 ? Math.min(rawMaxBid, Math.max(opening, arv - repairs - 15000)) : opening;

  const knownFields = [
    p.financial.arv,
    p.financial.opening_price,
    p.legal.title_status,
    p.legal.occupancy,
    p.physical.sqft,
    p.physical.condition,
  ].filter((v) => v !== null && v !== undefined).length;
  const confidence = Math.round(58 + (knownFields / 6) * 32);

  let verdict: AiPrediction["verdict"] = "MODERATE / CAUTION";
  let verdictColor = "#D97706";
  if (score >= 74 && effectiveFlag === "green") {
    verdict = "STRONG BUY";
    verdictColor = "#16A34A";
  } else if (score < 48 || effectiveFlag === "red") {
    verdict = "HIGH RISK / AVOID";
    verdictColor = "#DC2626";
  }

  if (netMargin > 0 && reasons.length < 3) {
    reasons.push(
      isEs
        ? `Equidad bruta potencial estimada en ${money(netMargin)} antes de costos de cierre.`
        : `Estimated gross equity spread of ${money(netMargin)} before closing costs.`
    );
  }

  return { score, verdict, verdictColor, aiMaxBid, confidence, reasons: reasons.slice(0, 3) };
}

export default function DetailDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language?.toLowerCase().startsWith("es") ?? false;
  const toast = useToast((s) => s.show);
  const userEmail = useAuth((s) => s.user?.email);
  const [tab, setTab] = useState<Tab>("fin");
  const { data: p, isLoading } = useProperty(id);
  const { ids } = useSavedIds();
  const toggleSaved = useToggleSaved();

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [sendEmailCopy, setSendEmailCopy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const open = !!id;
  const isSaved = id ? ids.has(id) : false;

  const ai = useMemo(() => (p ? computeAiPrediction(p, isEs) : null), [p, isEs]);

  const streetViewUrl = useMemo(() => {
      if (!p) return null;
      return (
        getRealStreetViewPhoto(p.address) ??
        (p.photos && p.photos.length > 0 ? p.photos[0] : null)
      );
    }, [p]);

  async function save() {
    if (!id) return;
    await toggleSaved.mutateAsync({ id, saved: isSaved });
    toast(isSaved ? t("removed_saved") : t("saved_toast"));
  }

  async function handleConfirmDownload() {
    if (!p) return;
    setDownloading(true);
    try {
      const { filename, base64 } = downloadPropertyDossierPdf(p, ai);
      if (sendEmailCopy) {
        await api.post(`/api/v1/properties/${p.id}/email-dossier`, {
          lang: isEs ? "es" : "en",
          pdf_base64: base64,
          filename,
        });
        toast(
          isEs
            ? `PDF descargado y adjuntado al correo ${userEmail ?? ""}`
            : `PDF downloaded and attached to email ${userEmail ?? ""}`
        );
      } else {
        toast(isEs ? "Dossier PDF descargado correctamente" : "PDF dossier downloaded successfully");
      }
      setExportModalOpen(false);
    } catch {
      toast(
        isEs
          ? "PDF descargado (no se pudo enviar la copia por correo)"
          : "PDF downloaded (email copy could not be sent)"
      );
      setExportModalOpen(false);
    } finally {
      setDownloading(false);
    }
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

  const roiStyle = p
    ? roiVisualStyle(p.financial.estimated_roi, p.flag ?? p.legal.documentary_flag ?? null)
    : { bg: "var(--risk-pending-bg)", accent: "#374151" };

  return (
    <>
      <div
        className={`fixed inset-0 z-[1999] bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-[2000] flex h-full w-[440px] max-w-[92vw] flex-col bg-paper shadow-[-12px_0_40px_rgba(0,0,0,.2)] transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {isLoading || !p ? (
          <Spinner label={t("loading")} />
        ) : (
          <>
            {streetViewUrl && (
              <div className="relative h-[145px] w-full shrink-0 overflow-hidden bg-wash">
                <img
                  src={streetViewUrl}
                  alt={p.address}
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white hover:bg-black/80"
                >
                  ✕
                </button>
                <span className="pointer-events-none absolute bottom-2.5 left-4 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/95">
                  Google Street View · Mercer County, NJ
                </span>
              </div>
            )}

            <div className="border-b border-line2 p-[14px_20px]">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold">{p.address}</h2>
                  <div className="text-[13px] text-ink2">
                    {p.city}, NJ {p.zip}
                  </div>
                </div>
                {!streetViewUrl && (
                  <span className="cursor-pointer text-xl text-ink2" onClick={onClose}>
                    ✕
                  </span>
                )}
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
                    style={{ background: roiStyle.bg, color: "#111827" }}
                  >
                    <div className="text-3xl font-extrabold" style={{ color: roiStyle.accent }}>
                      {roiText(p.financial.estimated_roi)}
                    </div>
                    <div className="text-xs font-medium" style={{ color: "#4B5563" }}>
                      {t("roi_cap")}
                    </div>
                  </div>

                  {ai && (
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
                          <div className="text-[11px] text-ink2">
                            {isEs
                              ? `Puntaje de viabilidad · ${ai.confidence}% conf.`
                              : `Viability Score · ${ai.confidence}% conf.`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-ink">{money(ai.aiMaxBid)}</div>
                          <div className="text-[11px] text-ink2">
                            {isEs ? "Puja Máxima Óptima IA" : "AI Optimal Max Bid"}
                          </div>
                        </div>
                      </div>
                      <ul className="mt-2.5 space-y-1 border-t border-line2 pt-2 text-[12px] text-ink2">
                        {ai.reasons.map((reason, idx) => (
                          <li key={idx}>• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <KV k={t("fin_opening")} v={money(p.financial.opening_price)} />
                  <KV
                    k={t("fin_liens")}
                    v={
                      p.financial.total_liens_verified === true
                        ? money(p.financial.total_liens)
                        : `${money(p.financial.total_liens)} · ${t("not_verified")}`
                    }
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
                  <KV
                    k={t("leg_bankruptcy")}
                    v={
                      p.legal.bankruptcy_indicator === null || p.legal.bankruptcy_indicator === undefined
                        ? "—"
                        : p.legal.bankruptcy_indicator
                          ? t("yes")
                          : t("no")
                    }
                  />
                  <KV
                    k={t("leg_open_permits")}
                    v={
                      p.legal.open_permits_count === null || p.legal.open_permits_count === undefined
                        ? "—"
                        : String(p.legal.open_permits_count)
                    }
                  />
                  <KV
                    k={t("leg_defendants")}
                    v={
                      p.legal.defendant_count === null || p.legal.defendant_count === undefined
                        ? "—"
                        : String(p.legal.defendant_count)
                    }
                  />
                  <KV k={t("leg_ownership")} v={p.legal.ownership_type ?? "—"} />
                  <KV
                    k={t("leg_mortgage")}
                    v={
                      p.legal.mortgage_active === null || p.legal.mortgage_active === undefined
                        ? "—"
                        : p.legal.mortgage_active
                          ? t("yes")
                          : t("no")
                    }
                  />
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
                          <div className="text-ink2">
                            {item.source}
                            {item.reference ? ` · ${item.reference}` : ""}
                            {item.date ? ` · ${item.date}` : ""}
                          </div>
                          {item.reported_amount !== null && item.reported_amount !== undefined && (
                            <div className="font-semibold">
                              {money(item.reported_amount)} {item.currency ?? ""}
                            </div>
                          )}
                          {item.note && <p className="mt-1 text-ink2">{item.note}</p>}
                        </div>
                      ))}
                      {p.legal.documentary_updated_at && (
                        <div className="mt-2 text-[10px] text-ink2">
                          {t("documentary_updated")}: {fdate(p.legal.documentary_updated_at)}
                        </div>
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
              <button className="btn btn-ghost flex-1" onClick={() => setExportModalOpen(true)}>
                ⬇ {t("cta_prepare")}
              </button>
            </div>
          </>
        )}
      </aside>

      {/* MODAL DE DESCARGA PDF + COPIA OPCIONAL AL CORREO */}
      {exportModalOpen && p && (
        <div
          className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !downloading && setExportModalOpen(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-2xl border border-line2 bg-paper p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold">Prepare for Auction · PDF Dossier</h3>
                <p className="mt-0.5 text-xs text-ink2">
                  {p.address}, {p.city}, NJ {p.zip}
                </p>
              </div>
              <button
                type="button"
                disabled={downloading}
                onClick={() => setExportModalOpen(false)}
                className="text-lg text-ink2 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-line2 bg-wash/60 p-3 text-xs text-ink2">
              {isEs ? (
                <>
                  Se descargará directamente el reporte ejecutivo en formato <b>PDF</b> con el análisis financiero, legal, físico, el diagnóstico de IA y los avisos regulatorios de ClearBid NJ.
                </>
              ) : (
                <>
                  Your executive due diligence dossier will download directly as a <b>PDF</b> including financial spread, legal status, physical profile, AI assessment, and ClearBid NJ disclosures.
                </>
              )}
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line2 p-3 text-[13px] hover:border-accent">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                checked={sendEmailCopy}
                onChange={(e) => setSendEmailCopy(e.target.checked)}
              />
              <div>
                <div className="font-semibold">
                  {isEs
                    ? "Enviar una copia del PDF a mi correo registrado"
                    : "Send a PDF copy to my registered email"}
                </div>
                <div className="text-xs text-ink2">
                  {isEs
                    ? userEmail
                      ? `Opcional · Se enviará adjunto a ${userEmail}`
                      : "Opcional · Se enviará adjunto a tu correo de cuenta"
                    : userEmail
                      ? `Optional · Will be attached to ${userEmail}`
                      : "Optional · Will be attached to your account email"}
                </div>
              </div>
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={downloading}
                onClick={() => setExportModalOpen(false)}
                className="btn btn-ghost"
              >
                {isEs ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={downloading}
                onClick={handleConfirmDownload}
                className="btn"
              >
                {downloading
                  ? isEs
                    ? "Generando..."
                    : "Generating..."
                  : isEs
                    ? "Descargar PDF"
                    : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function flagBg(flag: string | null): string {
  const s = flagShort(flag);
  return s === "g"
    ? "risk-green-bg"
    : s === "a"
      ? "risk-amber-bg"
      : s === "r"
        ? "risk-red-bg"
        : "risk-pending-bg";
}