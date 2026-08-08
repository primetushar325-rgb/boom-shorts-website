import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { sql } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/requireAdmin";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const totalOrdersRow = await db.execute(sql`select count(*)::int as count from ${orders}`);
  const pendingRow = await db.execute(
    sql`select count(*)::int as count from ${orders} where status = 'pending'`,
  );
  const revenueRow = await db.execute(
    sql`select coalesce(sum(price), 0)::float as total from ${orders} where status in ('confirmed', 'completed')`,
  );
  const topPackageRow = await db.execute(
    sql`select package_name, count(*)::int as count from ${orders} group by package_name order by count desc limit 1`,
  );

  const s = await getSettings();

  const totalOrders = (totalOrdersRow.rows[0] as { count: number } | undefined)?.count ?? 0;
  const pendingOrders = (pendingRow.rows[0] as { count: number } | undefined)?.count ?? 0;
  const revenue = (revenueRow.rows[0] as { total: number } | undefined)?.total ?? 0;
  const topPackage = (topPackageRow.rows[0] as { package_name: string; count: number } | undefined) ?? null;

  return NextResponse.json({
    totalOrders,
    pendingOrders,
    revenue,
    topPackage: topPackage ? { name: topPackage.package_name, count: topPackage.count } : null,
    totalVisitors: s.totalVisitors,
  });
}
