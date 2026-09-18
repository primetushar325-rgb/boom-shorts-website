import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { customers, orders, packages, reviews } from "@/db/schema";
import { isAdminAuthed } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

async function scalar(query: ReturnType<typeof sql>): Promise<number> {
  const result = await db.execute<{ value: number }>(query);
  return Number((result.rows[0] as { value?: number } | undefined)?.value ?? 0);
}

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const [
    totalOrders,
    pendingOrders,
    verifiedOrders,
    processingOrders,
    completedOrders,
    cancelledOrders,
    rejectedOrders,
    revenue,
    customersCount,
    availablePackages,
    totalPackages,
    pendingReviews,
    approvedReviews,
  ] = await Promise.all([
    scalar(sql`select count(*)::int as value from ${orders}`),
    scalar(sql`select count(*)::int as value from ${orders} where status = 'pending'`),
    scalar(sql`select count(*)::int as value from ${orders} where status = 'payment_verified'`),
    scalar(sql`select count(*)::int as value from ${orders} where status = 'processing'`),
    scalar(sql`select count(*)::int as value from ${orders} where status = 'completed'`),
    scalar(sql`select count(*)::int as value from ${orders} where status = 'cancelled'`),
    scalar(sql`select count(*)::int as value from ${orders} where status = 'rejected'`),
    scalar(
      sql`select coalesce(sum(price), 0)::float as value from ${orders} where status in ('payment_verified','processing','completed')`,
    ),
    scalar(sql`select count(*)::int as value from ${customers}`),
    scalar(sql`select count(*)::int as value from ${packages} where available = true and visible = true`),
    scalar(sql`select count(*)::int as value from ${packages}`),
    scalar(sql`select count(*)::int as value from ${reviews} where status = 'pending'`),
    scalar(sql`select count(*)::int as value from ${reviews} where status = 'approved'`),
  ]);

  const recentOrders = await db
    .select({
      id: orders.id,
      orderCode: orders.orderCode,
      customerName: orders.customerName,
      whatsapp: orders.whatsapp,
      packageName: orders.packageName,
      quantity: orders.quantity,
      price: orders.price,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(5);

  const topPackage = await db.execute<{ package_name: string; count: number }>(
    sql`select package_name, count(*)::int as count from ${orders} group by package_name order by count desc limit 1`,
  );

  const settings = await getSettings();
  const top = topPackage.rows[0];

  return NextResponse.json({
    totalOrders,
    pendingOrders,
    verifiedOrders,
    processingOrders,
    completedOrders,
    cancelledOrders,
    rejectedOrders,
    revenue,
    customers: customersCount,
    availablePackages,
    totalPackages,
    pendingReviews,
    approvedReviews,
    totalVisitors: settings.totalVisitors,
    topPackage: top ? { name: top.package_name, count: Number(top.count) } : null,
    recentOrders: recentOrders.map((order) => ({
      ...order,
      createdAt: new Date(order.createdAt).toISOString(),
    })),
  });
}
