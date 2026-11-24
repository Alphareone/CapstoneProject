import { useTranslation } from "react-i18next";

import FlagPill from "@/components/ui/FlagPill";
import { money, roiClass, roiText, TYPE_LBL } from "@/lib/format";
import { getRealStreetViewPhoto } from "@/lib/propertyPhotos";
import type { PropertyListItem } from "@/types/api";

function cardPhoto(p: PropertyListItem): string {
  const localPhoto = getRealStreetViewPhoto(p.address);
  if (localPhoto) return localPhoto;
  if (p.thumbnail_url && !p.thumbnail_url.includes("unsplash.com")) {
    return p.thumbnail_url;
  }
  return "/properties/121-palmer.png";
}

export default function PropertyCards({
  items,
  selection,
  onToggle,
  onOpen,
}: {
  items: PropertyListItem[];
  selection: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-[14px]">
      {items.map((p) => (
        <div
          key={p.id}
          onClick={() => onOpen(p.id)}
          className={`group relative cursor-pointer overflow-hidden rounded-xl border border-line2 bg-paper transition hover:border-accent ${
            selection.has(p.id) ? "outline outline-2 outline-accent" : ""
          }`}
        >
          <div className="relative h-[142px] w-full overflow-hidden bg-wash">
            <img
              src={cardPhoto(p)}
              alt={p.address}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />
            <input
              type="checkbox"
              className="absolute left-[9px] top-[9px] z-10 h-[18px] w-[18px] accent-[var(--accent)]"
              checked={selection.has(p.id)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggle(p.id)}
            />
            <span className="absolute right-[9px] top-[9px] z-10 rounded-2xl bg-paper/95 px-[9px] py-[3px] shadow backdrop-blur-xs">
              <FlagPill flag={p.flag} provisionalFlag={p.documentary_flag} />
            </span>
            <span className="pointer-events-none absolute bottom-[7px] left-[9px] rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/95">
              Street View · Mercer NJ
            </span>
          </div>
          <div className="p-[11px_13px]">
            <div className="truncate font-bold">{p.address}</div>
            <div className="mt-[1px] text-xs text-ink2">
              {p.city}, NJ {p.zip} · {p.property_type ? TYPE_LBL[p.property_type] : "—"}
            </div>
            <div className="mt-[9px] flex gap-[14px]">
              <Stat k={t("col_opening")} v={money(p.opening_price)} />
              <Stat k={t("col_arv")} v={money(p.estimated_value)} />
              <Stat k="ROI" v={roiText(p.estimated_roi)} cls={roiClass(p.estimated_roi)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ k, v, cls }: { k: string; v: string; cls?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-ink2">{k}</div>
      <div className={`text-[13px] font-bold ${cls ?? ""}`}>{v}</div>
    </div>
  );
}