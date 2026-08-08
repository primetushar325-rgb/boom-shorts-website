import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/requireAdmin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminMobileNav from "@/components/admin/AdminMobileNav";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const authed = await isAdminAuthed();
  if (!authed) redirect("/admin/login");

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <AdminSidebar />
      <div className="flex-1">
        <AdminMobileNav />
        <div className="px-5 py-8 sm:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
