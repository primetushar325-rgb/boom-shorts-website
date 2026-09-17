import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { requireAdminJson } from "@/lib/requireAdmin";

/** GET /api/customers — admin only, paginated, with order totals. */
export async function GET(req: NextRequest) {
  const guard = await requireAdminJson();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const pageSize = 25;
  const search = (url.searchParams.get("q") ?? "").trim();

  const where = search
    ? sql`(${customers.name} ilike ${"%" + search + "%"} or ${customers.whatsapp} ilike ${"%" + search + "%"})`
    : undefined;

  const totalRows = await db.select({ count: sql<number>`count(*)::int` }).from(customers).where(where);
  const total = totalRows[0]?.count ?? 0;

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      whatsapp: customers.whatsapp,
      email: customers.email,
      createdAt: customers.createdAt,
      totalOrders: sql<number>`count(${orders.id})::int`,
      totalSpent: sql<number>`coalesce(sum(${orders.finalAmount}) filter (where ${orders.status} in ('confirmed','completed')), 0)::float`,
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .where(where)
    .groupBy(customers.id)
    .orderBy(desc(sql`count(${orders.id})`), desc(customers.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({
    customers: rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
