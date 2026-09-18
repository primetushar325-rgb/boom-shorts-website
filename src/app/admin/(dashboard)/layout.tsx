import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminApp from "@/components/admin/AdminApp";
import { ensureSchema } from "@/db/ensureSchema";
import { isAdminAuthed } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  await ensureSchema();
  const authed = await isAdminAuthed();
  if (!authed) redirect("/admin/login");

  // The whole admin panel is a single mobile-app shell — child routes only
  // switch the active section (the URL stays shareable).
  void children;
  return <AdminApp />;
}
