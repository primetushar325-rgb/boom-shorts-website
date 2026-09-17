"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Admin App navigation shell.
 *
 * Mobile-first: a fixed bottom tab bar (Android-style) on small screens and a
 * collapsible sidebar from `lg` upwards, so the same app works on a phone and
 * on a desktop without an oversized mobile nav.
 */
/**
 * Admin navigation.
 *
 * Mobile shows the first five plus a "More" sheet, so the ordering is
 * deliberate: the five day-to-day screens come first.
 *
 * Deliberately NOT listed (both pages still exist, they are just redundant):
 *  - /admin/testimonials — manages the SAME `testimonials` table as
 *    /admin/reviews (see src/app/api/reviews/route.ts and
 *    src/app/api/testimonials/route.ts, which both import `testimonials`).
 *    Two editors for one table invites conflicting writes; /admin/reviews is
 *    the newer one (customer submissions + approval), so it wins.
 *  - /admin/sections — the `sections` table is not read by any customer page.
 *    Kept on disk in case it is wanted later, but hidden rather than offered.
 */
export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/orders", label: "Orders", icon: "🧾" },
  { href: "/admin/packages", label: "Packages", icon: "📦" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
  { href: "/admin/payments", label: "Payments", icon: "💳" },
  { href: "/admin/product-videos", label: "Videos", icon: "🎬" },
  { href: "/admin/reviews", label: "Reviews", icon: "⭐" },
  { href: "/admin/coupons", label: "Coupons", icon: "🏷️" },
  { href: "/admin/banners", label: "Banner", icon: "🖼️" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
  { href: "/admin/faqs", label: "FAQs", icon: "❓" },
  { href: "/admin/gallery", label: "Gallery", icon: "🎞️" },
  { href: "/admin/notices", label: "Notices", icon: "📣" },
  { href: "/admin/proof-slides", label: "Proof", icon: "🏆" },
  { href: "/admin/free-video", label: "Free Videos", icon: "🎁" },
];

export default function AdminShell({
  children,
  adminEmail,
}: {
  children: React.ReactNode;
  adminEmail: string;
}) {
  const pathname = usePathname() ?? "/admin";
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const primary = ADMIN_NAV.slice(0, 5);

  return (
    <div className="flex min-h-screen bg-[#0b1220]">
      {/* ---------- desktop sidebar ---------- */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-[#0e1628] p-4 lg:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-bs-primary text-xs font-black text-white">
            BS
          </span>
          <span className="text-sm font-extrabold text-white">Boom Admin</span>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {ADMIN_NAV.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-bs-primary text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 pt-3">
          <p className="truncate px-2 text-[11px] text-slate-500">{adminEmail}</p>
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="mt-2 w-full rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            {busy ? "Signing out…" : "🚪 Logout"}
          </button>
        </div>
      </aside>

      {/* ---------- content ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b1220]/90 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-bs-primary text-xs font-black text-white">
              BS
            </span>
            <span className="text-sm font-extrabold text-white">Boom Admin</span>
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:opacity-50"
          >
            Logout
          </button>
        </header>

        <main className="bs-safe-bottom flex-1 px-4 py-5 pb-24 lg:px-6 lg:pb-8">{children}</main>

        {/* ---------- mobile bottom tab bar ---------- */}
        <nav
          aria-label="Admin"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0e1628]/95 backdrop-blur-xl lg:hidden"
        >
          <ul className="bs-safe-bottom flex items-stretch justify-around px-1 pt-1.5">
            {primary.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition ${
                      active ? "text-bs-primary" : "text-slate-500"
                    }`}
                  >
                    <span
                      className={`grid h-7 w-11 place-items-center rounded-full text-base ${
                        active ? "bg-bs-primary/15" : ""
                      }`}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li className="flex-1">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("admin-more-sheet");
                  el?.classList.toggle("hidden");
                }}
                aria-label="More sections"
                className="flex w-full flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold text-slate-500"
              >
                <span className="grid h-7 w-11 place-items-center rounded-full text-base">⋯</span>
                More
              </button>
            </li>
          </ul>
        </nav>

        {/* ---------- "More" sheet for the remaining sections ---------- */}
        <div
          id="admin-more-sheet"
          className="fixed inset-0 z-50 hidden bg-black/60 lg:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) e.currentTarget.classList.add("hidden");
          }}
        >
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-white/10 bg-[#0e1628] p-4 pb-8">
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
              More Sections
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ADMIN_NAV.slice(5).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    (e.currentTarget.closest("#admin-more-sheet") as HTMLElement | null)?.classList.add("hidden");
                  }}
                  className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-[11px] font-semibold transition ${
                    isActive(item.href)
                      ? "border-bs-primary bg-bs-primary/15 text-white"
                      : "border-white/10 text-slate-300"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
