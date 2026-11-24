import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router-dom";

import i18n, { LANGS, setLang } from "@/i18n";
import { useAuth } from "@/store/auth";
import { useFilterStore } from "@/store/filters";
import { useTheme } from "@/store/theme";

export default function TopBar({
  showFilterToggle = false,
  onOpenFilters,
}: {
  showFilterToggle?: boolean;
  onOpenFilters?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);
  const f = useFilterStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isDark = document.documentElement.classList.contains("dark");
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-semibold sm:px-3 sm:py-2 sm:text-[13.5px] ${
      isActive ? "bg-chip text-ink" : "text-ink2 hover:bg-wash"
    }`;

  const initials = user ? (user.first_name[0] ?? "") + (user.last_name[0] ?? "") : "?";

  const activeFiltersCount =
    f.flag.length +
    f.county_id.length +
    f.auction_type.length +
    f.property_type.length +
    (f.min_roi !== null ? 1 : 0);

  return (
    <header className="sticky top-0 z-30 border-b border-line2 bg-paper">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-[18px] sm:px-5">
        {showFilterToggle && (
          <button
            type="button"
            onClick={onOpenFilters}
            aria-label={t("f_filters")}
            className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line2 bg-wash px-2.5 text-xs font-bold text-ink lg:hidden"
          >
            <span>☰</span>
            <span className="hidden xs:inline">{t("f_filters")}</span>
            {activeFiltersCount > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-extrabold text-white">
                {activeFiltersCount}
              </span>
            )}
          </button>
        )}

        <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-extrabold sm:gap-2 sm:text-base">
          <span>🏛️</span>
          <span>ClearBid NJ</span>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={navClass}>
            {t("nav_dashboard")}
          </NavLink>
          <NavLink to="/saved" className={navClass}>
            {t("nav_saved")}
          </NavLink>
          <NavLink to="/alerts" className={navClass}>
            {t("nav_alerts")}
          </NavLink>
        </nav>

        <div className="hidden max-w-[360px] flex-1 items-center gap-2 rounded-[9px] border border-line bg-wash px-3 md:flex">
          <span className="text-ink2">🔍</span>
          <input
            className="w-full bg-transparent py-[9px] text-[13.5px] text-ink outline-none"
            placeholder={t("search_ph")}
            value={f.q}
            onChange={(e) => f.setQ(e.target.value)}
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-[10px]">
          <select
            className="select-input max-w-[92px] text-xs sm:max-w-none sm:text-sm"
            value={i18n.language}
            onChange={(e) => setLang(e.target.value)}
          >
            {LANGS.map(([c, n]) => (
              <option key={c} value={c}>
                {n}
              </option>
            ))}
          </select>
          <button
            className="iconbtn h-8 w-8 sm:h-9 sm:w-9"
            title="Theme"
            onClick={() => setTheme(theme === "dark" || isDark ? "light" : "dark")}
          >
            {isDark ? "☀" : "☾"}
          </button>

          <div className="relative" ref={menuRef}>
            <div
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-chip text-sm font-bold uppercase sm:h-9 sm:w-9 sm:text-base"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {initials}
            </div>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-40 min-w-[200px] rounded-xl border border-line2 bg-paper p-[6px] shadow-[0_10px_30px_rgba(0,0,0,.15)]">
                <div className="mb-1 border-b border-line2 px-3 py-[10px]">
                  <b className="block">
                    {user?.first_name} {user?.last_name}
                  </b>
                  <span className="text-xs text-ink2">{user?.email}</span>
                </div>
                <div
                  className="cursor-pointer rounded-lg px-3 py-[9px] text-[13.5px] hover:bg-chip"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/profile");
                  }}
                >
                  {t("menu_profile")}
                </div>
                <div
                  className="cursor-pointer rounded-lg px-3 py-[9px] text-[13.5px] hover:bg-chip"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/settings");
                  }}
                >
                  {t("menu_settings")}
                </div>
                <div
                  className="cursor-pointer rounded-lg px-3 py-[9px] text-[13.5px] text-red hover:bg-chip"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                >
                  {t("logout")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra móvil secundaria: navegación + buscador compacto */}
      <div className="flex flex-col gap-2 border-t border-line2/70 bg-paper px-3 py-2 md:hidden">
        <nav className="flex items-center gap-1 overflow-x-auto">
          <NavLink to="/" end className={navClass}>
            {t("nav_dashboard")}
          </NavLink>
          <NavLink to="/saved" className={navClass}>
            {t("nav_saved")}
          </NavLink>
          <NavLink to="/alerts" className={navClass}>
            {t("nav_alerts")}
          </NavLink>
        </nav>
        <div className="flex items-center gap-2 rounded-[9px] border border-line bg-wash px-2.5">
          <span className="text-xs text-ink2">🔍</span>
          <input
            className="w-full bg-transparent py-[7px] text-[13px] text-ink outline-none"
            placeholder={t("search_ph")}
            value={f.q}
            onChange={(e) => f.setQ(e.target.value)}
          />
        </div>
      </div>
    </header>
  );
}