import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { customers, orders } from "@/db/schema";
import { isAdminAuthed } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      createdAt: customers.createdAt,
      orderCount: sql<number>`count(${orders.id})::int`,
      paidTotal: sql<number>`coalesce(sum(case when ${orders.status} in ('payment_verified','processing','completed') then ${orders.price} else 0 end), 0)::float`,
      lastOrderAt: sql<string | null>`max(${orders.createdAt})`,
    })
    .from(customers)
    .leftJoin(orders, sql`${orders.whatsapp} = ${customers.phone}`)
    .groupBy(customers.id, customers.name, customers.phone, customers.createdAt)
    .orderBy(desc(customers.createdAt))
    .limit(200);

  return NextResponse.json({ customers: rows });
}
