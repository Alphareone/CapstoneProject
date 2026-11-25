import { useTranslation } from "react-i18next";

import Chip from "@/components/ui/Chip";
import { useFacets } from "@/hooks/useProperties";
import { useCounties } from "@/hooks/useReference";
import { useCreateSegment, useDeleteSegment, useSegments } from "@/hooks/useSegments";
import { AUCTIONS, AUC_LBL, TYPES, TYPE_LBL } from "@/lib/format";
import { useFilterStore } from "@/store/filters";
import { useToast } from "@/store/toast";

const FLAGS: { v: string; k: string; d: "g" | "a" | "r" }[] = [
  { v: "green", k: "green", d: "g" },
  { v: "yellow", k: "yellow", d: "a" },
  { v: "red", k: "red", d: "r" },
];
const ROIS = [
  { v: 15, l: "≥15%" },
  { v: 35, l: "≥35%" },
  { v: 100, l: "≥100%" },
];

export default function Sidebar({
  mobileOpen = false,
  onCloseMobile,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast((s) => s.show);
  const f = useFilterStore();
  const { data: counties } = useCounties();
  const { data: segments } = useSegments();
  const createSegment = useCreateSegment();
  const deleteSegment = useDeleteSegment();

  const { data: facets } = useFacets({
    flag: [],
    county_id: [],
    auction_type: [],
    property_type: [],
    min_roi: null,
    q: "",
    sort: f.sort,
    page: 1,
    page_size: 1,
  });

  const roiCount = (threshold: number) =>
    facets?.roi_buckets?.find((b) => b.gte === threshold)?.count;

  const Title = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-2 mt-4 px-[2px] text-xs font-extrabold uppercase tracking-wide text-ink2 first:mt-0">
      {children}
    </div>
  );

  async function saveSegment() {
    const name = window.prompt(t("f_savesegment"), `${t("f_segments")} ${(segments?.length ?? 0) + 1}`);
    if (!name) return;
    await createSegment.mutateAsync({ name, filters: f.asFilter(), alert_enabled: false });
    toast(t("seg_saved"));
  }

  const content = (
    <>
      <div className="mb-2 flex items-center justify-between">
        <Title>{t("f_filters")}</Title>
        <div className="flex items-center gap-3">
          <span className="cursor-pointer text-xs font-semibold text-accent2" onClick={f.clear}>
            {t("f_clear")}
          </span>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close filters"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-line2 text-sm text-ink2 hover:text-ink lg:hidden"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <Title>{t("f_flag")}</Title>
      <div className="flex flex-wrap gap-[7px]">
        {FLAGS.map((fl) => {
          const cnt = facets?.flag?.[fl.v];
          return (
            <Chip
              key={fl.v}
              active={f.flag.includes(fl.v)}
              dot={fl.d}
              onClick={() => f.toggle("flag", fl.v)}
            >
              {t(fl.k)}
              {typeof cnt === "number" && cnt > 0 ? ` (${cnt})` : ""}
            </Chip>
          );
        })}
      </div>

      <Title>{t("f_county")}</Title>
      <div className="flex flex-col">
        {(counties ?? []).map((c) => (
          <label key={c.id} className="flex items-center gap-2 px-[2px] py-[5px] text-[13px]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--accent)]"
              checked={f.county_id.includes(c.id)}
              onChange={() => f.toggle("county_id", c.id)}
            />
            {c.name} <span className="text-ink2">({c.opportunity_count})</span>
          </label>
        ))}
      </div>

      <Title>{t("f_auctiontype")}</Title>
      <div className="flex flex-wrap gap-[7px]">
        {AUCTIONS.map((a) => {
          const cnt = facets?.auction_type?.[a];
          return (
            <Chip
              key={a}
              active={f.auction_type.includes(a)}
              onClick={() => f.toggle("auction_type", a)}
            >
              {AUC_LBL[a] ?? a}
              {typeof cnt === "number" && cnt > 0 ? ` (${cnt})` : ""}
            </Chip>
          );
        })}
      </div>

      <Title>{t("f_type")}</Title>
      <div className="flex flex-wrap gap-[7px]">
        {TYPES.map((ty) => {
          const cnt = facets?.property_type?.[ty];
          return (
            <Chip
              key={ty}
              active={f.property_type.includes(ty)}
              onClick={() => f.toggle("property_type", ty)}
            >
              {TYPE_LBL[ty] ?? ty}
              {typeof cnt === "number" && cnt > 0 ? ` (${cnt})` : ""}
            </Chip>
          );
        })}
      </div>

      <Title>{t("f_roi")}</Title>
      <div className="flex flex-wrap gap-[7px]">
        {ROIS.map((r) => {
          const cnt = roiCount(r.v);
          return (
            <Chip key={r.v} active={f.min_roi === r.v} onClick={() => f.setRoi(r.v)}>
              {r.l}
              {typeof cnt === "number" && cnt > 0 ? ` (${cnt})` : ""}
            </Chip>
          );
        })}
      </div>

      <Title>{t("f_segments")}</Title>
      <div>
        {(segments ?? []).length === 0 && (
          <div className="px-[2px] py-1 text-xs text-ink2">{t("no_segments")}</div>
        )}
        {(segments ?? []).map((s) => (
          <div
            key={s.id}
            className="mb-[7px] flex cursor-pointer items-center gap-2 rounded-[9px] border border-line2 px-[10px] py-2 text-[13px] hover:border-accent"
            onClick={() => {
              f.applyFilter(s.filters);
              onCloseMobile?.();
            }}
          >
            🔖 {s.name} <span className="text-ink2">({s.match_count})</span>
            <span
              className="ml-auto font-bold text-red"
              onClick={(e) => {
                e.stopPropagation();
                void deleteSegment.mutateAsync(s.id).then(() => toast(t("segment_removed")));
              }}
            >
              ✕
            </span>
          </div>
        ))}
        <button className="btn btn-subtle btn-sm mt-1 w-full" onClick={saveSegment}>
          + {t("f_savesegment")}
        </button>
      </div>

      {onCloseMobile && (
        <button
          type="button"
          onClick={onCloseMobile}
          className="btn mt-5 w-full lg:hidden"
        >
          ✓ Ver resultados
        </button>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden overflow-y-auto border-r border-line2 bg-paper p-[18px_16px] lg:block">
        {content}
      </aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[1950] bg-black/50 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`fixed bottom-0 left-0 top-0 z-[1960] w-[290px] max-w-[85vw] overflow-y-auto border-r border-line2 bg-paper p-[18px_16px] shadow-2xl transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {content}
      </aside>
    </>
  );
}