import { useState } from "react";
import { useTranslation } from "react-i18next";

import DetailDrawer from "@/components/properties/DetailDrawer";
import FlagPill from "@/components/ui/FlagPill";
import Spinner from "@/components/ui/Spinner";
import { useAlerts, useMarkAlert, useReadAllAlerts } from "@/hooks/useAlerts";
import { useProperties } from "@/hooks/useProperties";
import { useSaved } from "@/hooks/useSaved";
import { fdate, money, roiText } from "@/lib/format";

export default function AlertsPage() {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useAlerts();
  const mark = useMarkAlert();
  const readAll = useReadAllAlerts();

  // Propiedades con bandera ROJA (riesgo crítico en Mercer County)
  const { data: redProps, isLoading: loadingRed } = useProperties({
    flag: ["red"],
    county_id: [],
    auction_type: [],
    property_type: [],
    min_roi: null,
    q: "",
    sort: "roi_desc",
    page: 1,
    page_size: 20,
  });

  // Propiedades guardadas en Watchlist (useSaved retorna PropertyListItem[] directamente)
  const { data: savedProps } = useSaved();

  if (isLoading || loadingRed) return <Spinner label={t("loading")} />;

  const items = data?.items ?? [];
  const criticalItems = redProps?.items ?? [];
  const watchlistItems = Array.isArray(savedProps) ? savedProps : [];

  return (
    <div className="mx-auto max-w-[860px] space-y-6">
      {/* BLOQUE 1: Alertas críticas del motor de reglas (Semáforo Rojo) */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-[19px] font-bold">
              High-Risk Auction Alerts · Mercer County
            </h1>
            <p className="text-xs text-ink2">
              Properties flagged by ClearBid Rules Registry (KR-01/KR-03,
              surviving liens, or title defects)
            </p>
          </div>
          <span className="rounded-full bg-[#8B1A1A] px-3 py-1 text-xs font-bold text-white">
            {criticalItems.length} Critical{" "}
            {criticalItems.length === 1 ? "Alert" : "Alerts"}
          </span>
        </div>

        {criticalItems.length === 0 ? (
          <div className="card-surface p-8 text-center text-sm text-ink2">
            No active high-risk red flags detected in current Mercer County
            docket.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {criticalItems.map((prop) => (
              <div
                key={prop.id}
                onClick={() => setSelectedId(prop.id)}
                className="card-surface flex cursor-pointer flex-wrap items-center justify-between gap-3 border-l-4 border-l-[#8B1A1A] p-4 transition hover:border-accent"
              >
                <div className="min-w-[220px] flex-1">
                  <div className="flex items-center gap-2">
                    <FlagPill
                      flag={prop.flag}
                      provisionalFlag={prop.documentary_flag}
                    />
                    <span className="font-bold">{prop.address}</span>
                  </div>
                  <div className="mt-1 text-xs text-ink2">
                    {prop.city}, NJ {prop.zip} · Opening:{" "}
                    <b>{money(prop.opening_price)}</b> · ARV:{" "}
                    <b>{money(prop.estimated_value)}</b> · Est. ROI:{" "}
                    <b>{roiText(prop.estimated_roi)}</b>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-subtle btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(prop.id);
                  }}
                >
                  Inspect Dossier →
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* BLOQUE 2: Watchlist & Notificaciones personales */}
      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-[17px] font-bold">
            Alerts · Watchlist &amp; Docket Updates
          </h2>
          {(data?.unread_count ?? 0) > 0 && (
            <span className="rounded-full bg-accent px-2 py-[2px] text-xs font-bold text-white">
              {data?.unread_count} {t("unread")}
            </span>
          )}
          {items.length > 0 && (
            <button
              className="btn btn-subtle btn-sm ml-auto"
              onClick={() => readAll.mutate()}
            >
              {t("mark_all_read")}
            </button>
          )}
        </div>

        {items.length === 0 && watchlistItems.length === 0 ? (
          <div className="card-surface p-8 text-center text-sm text-ink2">
            No personal watchlist notifications yet. Save any property to track
            docket adjournments.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((a) => (
              <div
                key={a.id}
                className={`card-surface flex cursor-pointer items-start gap-3 p-4 ${a.read ? "opacity-60" : ""}`}
                onClick={() => !a.read && mark.mutate({ id: a.id, read: true })}
              >
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.read ? "bg-line" : "bg-accent2"}`}
                />
                <div className="flex-1">
                  <div className="font-semibold">{a.title}</div>
                  {a.body && (
                    <div className="text-[13px] text-ink2">{a.body}</div>
                  )}
                  <div className="mt-1 text-xs text-ink2">
                    {fdate(a.created_at)}
                  </div>
                </div>
              </div>
            ))}

            {watchlistItems.map((w) => (
              <div
                key={w.id}
                onClick={() => setSelectedId(w.id)}
                className="card-surface flex cursor-pointer items-center justify-between gap-3 p-4 hover:border-accent"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-accent2">
                      ★ Watchlist Active
                    </span>
                    <span className="font-semibold">{w.address}</span>
                  </div>
                  <div className="mt-1 text-xs text-ink2">
                    Monitoring docket status &amp; adjournment changes ·{" "}
                    {w.city}, NJ
                  </div>
                </div>
                <FlagPill flag={w.flag} />
              </div>
            ))}
          </div>
        )}
      </section>

      <DetailDrawer id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
