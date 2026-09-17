import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import AdminShell from "@/components/admin/AdminShell";

/**
 * Admin App gate.
 *
 * The middleware only checks cookie *presence* (it runs on the edge and must
 * not touch the database). This layout performs the real verification against
 * the sessions table, and every API route re-checks independently — so
 * authorisation never depends on the UI hiding something.
 */
export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return <AdminShell adminEmail={admin.email}>{children}</AdminShell>;
}
