import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { customers, orders, packages } from "@/db/schema";
import { getAdminSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { taka } from "@/lib/pricing";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

const STATUS_PILL: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  confirmed: "bg-blue-500/15 text-blue-300",
  processing: "bg-blue-500/15 text-blue-300",
  completed: "bg-emerald-500/15 text-emerald-300",
  cancelled: "bg-slate-500/15 text-slate-300",
  rejected: "bg-red-500/15 text-red-300",
};

export default async function AdminDashboardPage() {
  const admin = await getAdminSession();
  const s = await getSettings();

  const [stats, recent, counts] = await Promise.all([
    db
      .select({
        totalOrders: sql<number>`count(*)::int`,
        pendingOrders: sql<number>`count(*) filter (where status = 'pending')::int`,
        completedOrders: sql<number>`count(*) filter (where status = 'completed')::int`,
        revenue: sql<number>`coalesce(sum(final_amount) filter (where status in ('confirmed','completed')), 0)::float`,
      })
      .from(orders),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
    (async () => {
      const c = await db.select({ n: sql<number>`count(*)::int` }).from(customers);
      const p = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(packages)
        .where(sql`archived = false and available = true`);
      return { customers: c[0]?.n ?? 0, availablePackages: p[0]?.n ?? 0 };
    })(),
  ]);

  const stat = stats[0];

  const cards: { label: string; value: string; tone?: string }[] = [
    { label: "Total Orders", value: String(stat.totalOrders) },
    { label: "Pending Verification", value: String(stat.pendingOrders), tone: "text-amber-300" },
    { label: "Completed", value: String(stat.completedOrders), tone: "text-emerald-300" },
    { label: "Revenue", value: taka(stat.revenue), tone: "text-emerald-300" },
    { label: "Customers", value: String(counts.customers) },
    { label: "Available Packages", value: String(counts.availablePackages) },
  ];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-white">Dashboard</h1>
        <p className="mt-0.5 text-xs text-slate-400">
          Signed in as {admin?.email} · {s.siteName}
        </p>
      </div>

      {admin?.mustChangePassword ? (
        <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
          <p className="text-sm font-bold text-amber-200">Please set a new password</p>
          <p className="mt-1 text-xs text-amber-200/80">
            Your account was migrated from the old shared password. Set a personal one in Settings.
          </p>
          <Link
            href="/admin/settings"
            className="mt-3 inline-block rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-900"
          >
            Go to Settings
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-white/10 bg-[#0e1628] p-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {c.label}
            </p>
            <p className={`mt-1 text-xl font-extrabold ${c.tone ?? "text-white"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-white">Recent Orders</h2>
          <Link href="/admin/orders" className="text-xs font-semibold text-bs-primary hover:underline">
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#0e1628] px-4 py-12 text-center">
            <p className="text-2xl">🧾</p>
            <p className="mt-2 text-sm font-bold text-white">No orders yet</p>
            <p className="mt-1 text-xs text-slate-400">
              New orders from the website will appear here instantly.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {recent.map((o) => {
              const status = (o.status as OrderStatus) in ORDER_STATUS_LABELS ? o.status : "pending";
              return (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders?id=${o.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0e1628] p-3.5 transition hover:border-bs-primary/50"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-bs-primary">#{o.orderNumber}</p>
                      <p className="truncate text-sm font-bold text-white">{o.customerName}</p>
                      <p className="truncate text-[11px] text-slate-400">{o.packageName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-extrabold text-white">
                        {taka(o.finalAmount ?? o.price)}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          STATUS_PILL[status] ?? "bg-slate-500/15 text-slate-300"
                        }`}
                      >
                        {ORDER_STATUS_LABELS[status as OrderStatus]}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
