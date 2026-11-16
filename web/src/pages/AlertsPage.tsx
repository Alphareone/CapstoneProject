import { useState } from "react";
import { useTranslation } from "react-i18next";

import DetailDrawer from "@/components/properties/DetailDrawer";
import FlagPill from "@/components/ui/FlagPill";
import Spinner from "@/components/ui/Spinner";
import { useAlerts, useMarkAlert, useReadAllAlerts } from "@/hooks/useAlerts";
import { useProperties } from "@/hooks/useProperties";
import { fdate, money, roiText } from "@/lib/format";

export default function AlertsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useAlerts();
  const mark = useMarkAlert();
  const readAll = useReadAllAlerts();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Traemos el docket completo y filtramos las propiedades con semáforo rojo (oficial o documental)
  const { data: allProps, isLoading: loadingProps } = useProperties({
    flag: [],
    county_id: [],
    auction_type: [],
    property_type: [],
    min_roi: null,
    q: "",
    sort: "",
    page: 1,
    page_size: 100,
  });

  if (isLoading || loadingProps) return <Spinner label={t("loading")} />;

  const items = data?.items ?? [];
  const highRiskList = (allProps?.items ?? []).filter(
    (p) => p.flag === "red" || p.documentary_flag === "red"
  );

  return (
    <div className="mx-auto max-w-[820px] space-y-6">
      {/* SECCIÓN 1: ALERTAS CRÍTICAS DEL MOTOR DE RIESGO (HIGH RISK / KILL RULES) */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-[19px] font-bold">
              High-Risk Auction Alerts · Mercer County
            </h1>
            <p className="text-[13px] text-ink2">
              Properties flagged by ClearBid Rules Registry (KR-01/KR-03, surviving liens, or title defects)
            </p>
          </div>
          <span className="rounded-full bg-[#B91C1C] px-3 py-1 text-xs font-bold text-white">
            {highRiskList.length} Critical Alerts
          </span>
        </div>

        {highRiskList.length === 0 ? (
          <div className="card-surface p-6 text-center text-sm text-ink2">
            No active high-risk red flags detected in current Mercer County docket.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {highRiskList.map((prop) => (
              <div
                key={prop.id}
                onClick={() => setSelectedId(prop.id)}
                className="card-surface flex cursor-pointer flex-wrap items-center justify-between gap-3 border-l-4 border-l-[#DC2626] p-4 transition hover:bg-wash"
              >
                <div className="min-w-[240px] flex-1">
                  <div className="flex items-center gap-2">
                    <FlagPill flag={prop.flag} provisionalFlag={prop.documentary_flag} />
                    <span className="text-xs font-semibold text-ink2">
                      Mercer County · {prop.zip}
                    </span>
                  </div>
                  <div className="mt-1.5 font-bold text-ink">{prop.address}</div>
                  <div className="text-xs text-ink2">
                    {prop.city}, NJ · Auction: {fdate(prop.auction_date)}
                  </div>
                </div>

                <div className="flex items-center gap-5 text-right">
                  <div>
                    <div className="text-[11px] uppercase text-ink2">Opening Bid</div>
                    <div className="text-sm font-bold text-ink">{money(prop.opening_price)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-ink2">ARV</div>
                    <div className="text-sm font-bold text-ink">{money(prop.estimated_value)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-ink2">Est. ROI</div>
                    <div className="text-sm font-extrabold text-[#B91C1C]">
                      {roiText(prop.estimated_roi)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECCIÓN 2: NOTIFICACIONES DE SEGUIMIENTO DEL USUARIO */}
      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-[16px] font-bold">{t("nav_alerts")} · Watchlist & Docket Updates</h2>
          {(data?.unread_count ?? 0) > 0 && (
            <span className="rounded-full bg-accent px-2 py-[2px] text-xs font-bold text-white">
              {data?.unread_count} {t("unread")}
            </span>
          )}
          {items.length > 0 && (
            <button className="btn btn-subtle btn-sm ml-auto" onClick={() => readAll.mutate()}>
              {t("mark_all_read")}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="card-surface p-8 text-center text-sm text-ink2">
            No personal watchlist notifications yet. Save any property to track docket adjournments.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((a) => (
              <div
                key={a.id}
                className={`card-surface flex cursor-pointer items-start gap-3 p-4 ${a.read ? "opacity-60" : ""}`}
                onClick={() => !a.read && mark.mutate({ id: a.id, read: true })}
              >
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.read ? "bg-line" : "bg-accent2"}`} />
                <div className="flex-1">
                  <div className="font-semibold">{a.title}</div>
                  {a.body && <div className="text-[13px] text-ink2">{a.body}</div>}
                  <div className="mt-1 text-xs text-ink2">{fdate(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <DetailDrawer id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}