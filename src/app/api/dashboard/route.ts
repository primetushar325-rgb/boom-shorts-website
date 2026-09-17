import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, orders, packages } from "@/db/schema";
import { requireAdminJson } from "@/lib/requireAdmin";
import { getSettings } from "@/lib/settings";

/** GET /api/dashboard — admin KPIs and the five most recent orders. */
export async function GET() {
  const guard = await requireAdminJson();
  if (!guard.ok) return guard.response;

  const [stats, recent, topPackage] = await Promise.all([
    db
      .select({
        totalOrders: sql<number>`count(*)::int`,
        pendingOrders: sql<number>`count(*) filter (where status = 'pending')::int`,
        confirmedOrders: sql<number>`count(*) filter (where status = 'confirmed')::int`,
        processingOrders: sql<number>`count(*) filter (where status = 'processing')::int`,
        completedOrders: sql<number>`count(*) filter (where status = 'completed')::int`,
        cancelledOrders: sql<number>`count(*) filter (where status in ('cancelled','rejected'))::int`,
        revenue: sql<number>`coalesce(sum(final_amount) filter (where status in ('confirmed','completed')), 0)::float`,
        pendingValue: sql<number>`coalesce(sum(final_amount) filter (where status = 'pending'), 0)::float`,
      })
      .from(orders),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5),
    db
      .select({ name: orders.packageName, count: sql<number>`count(*)::int` })
      .from(orders)
      .groupBy(orders.packageName)
      .orderBy(desc(sql`count(*)`))
      .limit(1),
  ]);

  const [counts] = await Promise.all([
    (async () => {
      const c = await db.select({ n: sql<number>`count(*)::int` }).from(customers);
      const p = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(packages)
        .where(sql`archived = false and available = true`);
      return { customers: c[0]?.n ?? 0, availablePackages: p[0]?.n ?? 0 };
    })(),
  ]);

  const s = await getSettings();

  return NextResponse.json({
    ...stats[0],
    totalCustomers: counts.customers,
    availablePackages: counts.availablePackages,
    totalVisitors: s.totalVisitors,
    topPackage: topPackage[0] ? { name: topPackage[0].name, count: topPackage[0].count } : null,
    recentOrders: recent.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      packageName: o.packageName,
      finalAmount: o.finalAmount ?? o.price,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
    })),
  });
}
