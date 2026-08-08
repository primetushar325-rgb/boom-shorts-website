"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/packages", label: "Packages", icon: "📦" },
  { href: "/admin/orders", label: "Orders", icon: "🧾" },
  { href: "/admin/coupons", label: "Coupons", icon: "🏷️" },
  { href: "/admin/sections", label: "Custom Sections", icon: "🧩" },
  { href: "/admin/banners", label: "Banners", icon: "🖼️" },
  { href: "/admin/notices", label: "Notice Board", icon: "📢" },
  { href: "/admin/testimonials", label: "Testimonials", icon: "⭐" },
  { href: "/admin/proof-slides", label: "Client Reviews", icon: "📸" },
  { href: "/admin/free-video", label: "Free Video Cards", icon: "🎁" },
  { href: "/admin/faqs", label: "FAQ", icon: "❓" },
  { href: "/admin/gallery", label: "Gallery", icon: "🖼️" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];
const links = adminLinks;

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-white/10 bg-slate-900/60 p-5 backdrop-blur lg:flex">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-extrabold">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600">
          🎬
        </span>
        Admin Panel
      </Link>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-gradient-to-r from-amber-400/20 to-yellow-600/20 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>{l.icon}</span> {l.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={logout}
        className="mt-4 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5"
      >
        🚪 Logout
      </button>
    </aside>
  );
}
