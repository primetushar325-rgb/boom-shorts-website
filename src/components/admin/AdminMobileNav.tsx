"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminLinks } from "./AdminSidebar";

export default function AdminMobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 overflow-x-auto border-b border-white/10 bg-slate-900/80 px-3 py-3 backdrop-blur lg:hidden">
      {adminLinks.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
            pathname === l.href ? "bg-amber-500 text-white" : "bg-white/5 text-slate-300"
          }`}
        >
          {l.icon} {l.label}
        </Link>
      ))}
      <button
        onClick={logout}
        className="whitespace-nowrap rounded-full bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white"
      >
        🚪 Logout
      </button>
    </div>
  );
}
