"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_SECTIONS, CustomersPanel, DashboardPanel, ReviewsPanel } from "./panels";
import { OrdersPanel } from "./panel-orders";
import { PackagesPanel } from "./panel-packages";
import { COLLECTIONS, CollectionPanel, SettingsPanel, VideosPanel } from "./panel-content";

const SCREEN_TABS = ["Menu", "List", "Detail"];

const MOBILE_NAV = [
  { id: "dashboard", label: "Home", icon: "📊" },
  { id: "orders", label: "Orders", icon: "🧾" },
  { id: "packages", label: "Packages", icon: "📦" },
  { id: "reviews", label: "Reviews", icon: "⭐" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

function sectionFromPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "admin" || parts.length < 2) return "dashboard";
  return parts[1];
}

export default function AdminApp() {
  const pathname = usePathname();
  const router = useRouter();
  const section = sectionFromPath(pathname);
  const [screen, setScreen] = useState(0);
  const [lastSection, setLastSection] = useState(section);
  const [busy, setBusy] = useState(false);

  // Switching section resets the visible screen — adjusted during render
  // instead of in an effect (React's recommended pattern).
  if (lastSection !== section) {
    setLastSection(section);
    setScreen(0);
  }

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const meta = ADMIN_SECTIONS.find((item) => item.id === section);

  function renderPanel() {
    switch (section) {
      case "orders":
        return <OrdersPanel activeScreen={screen} />;
      case "payments":
        return <OrdersPanel activeScreen={screen} mode="payments" />;
      case "packages":
        return <PackagesPanel activeScreen={screen} />;
      case "customers":
        return <CustomersPanel activeScreen={screen} />;
      case "reviews":
        return <ReviewsPanel activeScreen={screen} />;
      case "settings":
        return <SettingsPanel activeScreen={screen} />;
      case "videos":
        return <VideosPanel activeScreen={screen} />;
      default: {
        const collection = COLLECTIONS[section];
        if (collection) return <CollectionPanel config={collection} activeScreen={screen} />;
        return <DashboardPanel activeScreen={screen} />;
      }
    }
  }

  return (
    <div className="min-h-screen bg-surface pb-24 lg:pb-6">
      <header className="sticky top-0 z-30 border-b border-line bg-coal/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold text-ink">
              ⚙️
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-extrabold text-warm">
                {meta?.label ?? "Dashboard"}
              </p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-2">Admin app</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/" className="btn-outline px-3 py-1.5 text-[11px]">
              View site
            </Link>
            <button
              type="button"
              onClick={logout}
              disabled={busy}
              className="btn-ghost px-3 py-1.5 text-[11px]"
            >
              {busy ? "…" : "Logout"}
            </button>
          </div>
        </div>

        <div className="mx-auto flex max-w-6xl gap-2 px-3 pb-3 lg:hidden">
          {SCREEN_TABS.map((tab, index) => (
            <button
              key={tab}
              type="button"
              onClick={() => setScreen(index)}
              className={`admin-tab ${screen === index ? "admin-tab-active" : "border border-line bg-coal"}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-3 py-4 lg:grid-cols-3">
        {renderPanel()}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-coal/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg">
          {MOBILE_NAV.map((item) => {
            const active = section === item.id;
            return (
              <Link
                key={item.id}
                href={`/admin/${item.id}`}
                className={`bottom-nav-item ${active ? "bottom-nav-item-active" : ""}`}
              >
                <span className="text-base" aria-hidden>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
