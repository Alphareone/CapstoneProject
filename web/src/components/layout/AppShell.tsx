import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

// Layout principal: la sidebar de filtros aparece fija en desktop y como drawer en móvil.
export default function AppShell() {
  const { pathname } = useLocation();
  const showSidebar = pathname === "/";
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setMobileFiltersOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen overflow-x-clip">
      <TopBar
        showFilterToggle={showSidebar}
        onOpenFilters={() => setMobileFiltersOpen(true)}
      />
      <div
        className={`grid min-h-[calc(100vh-56px)] ${
          showSidebar ? "grid-cols-1 lg:grid-cols-[270px_1fr]" : "grid-cols-1"
        }`}
      >
        {showSidebar && (
          <Sidebar
            mobileOpen={mobileFiltersOpen}
            onCloseMobile={() => setMobileFiltersOpen(false)}
          />
        )}
        <main className="min-w-0 overflow-x-auto p-3.5 sm:p-[18px_22px]">
          <Outlet context={{ onOpenFilters: () => setMobileFiltersOpen(true) }} />
        </main>
      </div>
    </div>
  );
}