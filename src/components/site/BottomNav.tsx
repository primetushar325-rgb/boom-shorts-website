"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Mobile-only bottom navigation.
 *
 * Hidden from `md` upwards, where the desktop header takes over — so the
 * desktop layout never gets an oversized mobile nav bar.
 */
const TABS = [
  { href: "/", label: "Home", icon: "🏠", match: (p: string) => p === "/" },
  { href: "/orders", label: "Orders", icon: "🧾", match: (p: string) => p.startsWith("/orders") || p.startsWith("/order/") },
  { href: "/reviews", label: "Reviews", icon: "⭐", match: (p: string) => p === "/reviews" },
  { href: "/profile", label: "Profile", icon: "👤", match: (p: string) => p.startsWith("/profile") },
];

export default function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Primary"
      className="bs-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-bs-line bg-white/90 backdrop-blur-xl md:hidden"
      style={{ boxShadow: "0 -6px 24px -12px rgba(15,23,42,0.18)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.label} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold transition ${
                  active ? "text-bs-primary" : "text-slate-400"
                }`}
              >
                <span
                  className={`grid h-7 w-12 place-items-center rounded-full text-base transition ${
                    active ? "bg-bs-primary-soft" : ""
                  }`}
                  style={active ? { boxShadow: "0 0 0 1px rgba(37,99,235,0.15), 0 4px 12px -4px rgba(37,99,235,0.5)" } : undefined}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
