import { useTranslation } from "react-i18next";

import FlagPill from "@/components/ui/FlagPill";
import { money, roiClass, roiText, TYPE_LBL } from "@/lib/format";
import type { PropertyListItem } from "@/types/api";

const SINGLE_FAMILY_PHOTOS = [
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1598228723793-52759bba239c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1602941525421-8f8b81d3edbb?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1592595896616-c37162298647?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1605146769289-440113cc3d00?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1599427303058-f04cbcf4756f?auto=format&fit=crop&w=800&q=80",
];

const MULTI_FAMILY_PHOTOS = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
];

function cardPhoto(p: PropertyListItem, index: number): string {
  if (p.thumbnail_url && p.thumbnail_url.startsWith("http") && !p.thumbnail_url.includes("unsplash.com")) {
    return p.thumbnail_url;
  }
  if (p.property_type === "multi_family" || p.property_type === "condo") {
    return MULTI_FAMILY_PHOTOS[index % MULTI_FAMILY_PHOTOS.length];
  }
  return SINGLE_FAMILY_PHOTOS[index % SINGLE_FAMILY_PHOTOS.length];
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
      {items.map((p, index) => (
        <div
          key={p.id}
          onClick={() => onOpen(p.id)}
          className={`group relative cursor-pointer overflow-hidden rounded-xl border border-line2 bg-paper transition hover:border-accent ${
            selection.has(p.id) ? "outline outline-2 outline-accent" : ""
          }`}
        >
          <div className="relative h-[136px] w-full overflow-hidden bg-wash">
            <img
              src={cardPhoto(p, index)}
              alt={p.address}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/20" />
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