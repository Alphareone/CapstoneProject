import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import i18n, { LANGS, setLang } from "@/i18n";
import { useTheme } from "@/store/theme";
import { useToast } from "@/store/toast";

type FontScale = "normal" | "large" | "xlarge";

const FONT_SCALES: { id: FontScale; label: string; pct: string }[] = [
  { id: "normal", label: "Normal (100%)", pct: "100%" },
  { id: "large", label: "Large (112%)", pct: "112.5%" },
  { id: "xlarge", label: "Extra Large (125%)", pct: "125%" },
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const toast = useToast((s) => s.show);
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);

  const [zone, setZone] = useState("");
  const [zones, setZones] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("cb_coverage_zones");
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [fontScale, setFontScale] = useState<FontScale>(() => {
    const saved = localStorage.getItem("cb_font_scale") as FontScale | null;
    return saved && ["normal", "large", "xlarge"].includes(saved) ? saved : "normal";
  });

  useEffect(() => {
    const found = FONT_SCALES.find((s) => s.id === fontScale) ?? FONT_SCALES[0];
    document.documentElement.style.fontSize = found.pct;
    localStorage.setItem("cb_font_scale", fontScale);
  }, [fontScale]);

  function addZone(e: React.FormEvent) {
    e.preventDefault();
    const clean = zone.trim();
    if (!clean || zones.includes(clean)) return;
    const next = [...zones, clean];
    setZones(next);
    localStorage.setItem("cb_coverage_zones", JSON.stringify(next));
    setZone("");
    toast(t("settings_saved"));
  }

  function removeZone(z: string) {
    const next = zones.filter((x: string) => x !== z);
    setZones(next);
    localStorage.setItem("cb_coverage_zones", JSON.stringify(next));
    toast(t("settings_saved"));
  }

  const isDark =
    theme === "dark" || (theme === "system" && document.documentElement.classList.contains("dark"));

  return (
    <div className="mx-auto max-w-[680px]">
      <h1 className="mb-4 text-xl font-bold">{t("set_title")}</h1>

      <div className="card-surface mb-4 p-5">
        <h2 className="mb-3 text-base font-bold">{t("set_appearance")}</h2>

        <div className="flex items-center justify-between border-b border-line2 py-3">
          <span className="text-[14px]">{t("set_lang")}</span>
          <select
            className="select-input"
            value={i18n.language}
            onChange={(e) => {
              setLang(e.target.value);
              toast(t("settings_saved"));
            }}
          >
            {LANGS.map(([c, n]) => (
              <option key={c} value={c}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line2 py-3">
          <div>
            <div className="text-[14px]">{t("set_text_size")}</div>
            <div className="text-xs text-ink2">{t("set_text_size_sub")}</div>
          </div>
          <div className="flex rounded-lg bg-chip p-1">
            {FONT_SCALES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setFontScale(s.id);
                  toast(t("settings_saved"));
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  fontScale === s.id ? "bg-paper text-ink shadow" : "text-ink2 hover:text-ink"
                }`}
              >
                {s.id === "normal" ? "A" : s.id === "large" ? "A+" : "A++"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3">
          <div>
            <div className="text-[14px]">{t("set_dark")}</div>
            <div className="text-xs text-ink2">{t("set_dark_sub")}</div>
          </div>
          <label className="relative inline-block h-[26px] w-[46px] cursor-pointer">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={isDark}
              onChange={(e) => {
                const next = e.target.checked ? "dark" : "light";
                setTheme(next);
                toast(t("settings_saved"));
              }}
            />
            <span className="block h-full w-full rounded-full bg-line transition peer-checked:bg-accent" />
            <span className="absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </label>
        </div>
        <div className="mt-2 text-xs text-ink2">{t("theme_current", { theme })}</div>
      </div>

      <div className="card-surface p-5">
        <h2 className="mb-1 text-base font-bold">{t("set_zones")}</h2>
        <p className="mb-3 text-xs text-ink2">{t("set_zones_sub")}</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {zones.map((z: string) => (
            <span
              key={z}
              className="inline-flex items-center gap-2 rounded-full bg-chip px-3 py-1 text-xs font-semibold"
            >
              {z}
              <button
                type="button"
                className="font-bold text-red"
                onClick={() => removeZone(z)}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={addZone} className="flex gap-2">
          <input
            className="input-field flex-1"
            placeholder={t("set_zone_ph")}
            value={zone}
            onChange={(e) => setZone(e.target.value)}
          />
          <button type="submit" className="btn">
            {t("set_zone_add")}
          </button>
        </form>
      </div>
    </div>
  );
}