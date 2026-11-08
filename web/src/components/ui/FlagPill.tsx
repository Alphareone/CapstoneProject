import { useTranslation } from "react-i18next";

import { flagShort } from "@/lib/format";
import type { Flag } from "@/types/api";

const COLORS: Record<string, string> = {
  g: "#1A5C2E",
  a: "#7A4800",
  r: "#8B1A1A",
  p: "var(--ink2)",
};
const BACKGROUNDS: Record<string, string> = {
  g: "#E8F5E9",
  a: "#FFF3E0",
  r: "#FDECEA",
  p: "var(--chip)",
};

export default function FlagPill({ flag, provisionalFlag }: { flag: Flag | null; provisionalFlag?: Flag | null }) {
  const { t } = useTranslation();
  const isProvisional = flag === null && Boolean(provisionalFlag);
  const s = flagShort(flag ?? provisionalFlag ?? null);
  const label = s === "g" ? t("flag_g")
    : s === "a" ? t("flag_a")
    : s === "r" ? t("flag_r")
    : t("flag_pending");
  return (
    <span
      className="inline-flex items-center gap-[6px] rounded-full px-2 py-1 text-xs font-bold"
      style={{ color: COLORS[s], background: BACKGROUNDS[s] }}
    >
      <i className={`dot ${s}`} />
      {isProvisional ? t("flag_provisional", { level: label }) : label}
    </span>
  );
}
