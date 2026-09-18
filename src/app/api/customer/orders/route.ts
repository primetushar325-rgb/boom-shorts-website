import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { orders } from "@/db/schema";
import { getCustomerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * A customer only ever sees their own orders — the filter is the session's
 * phone number, never anything supplied by the browser.
 */
export async function GET() {
  await ensureSchema();

  const customer = await getCustomerSession();
  if (!customer) return NextResponse.json({ orders: [] }, { status: 401 });

  const rows = await db
    .select({
      id: orders.id,
      orderCode: orders.orderCode,
      packageName: orders.packageName,
      packageQuantity: orders.packageQuantity,
      quantity: orders.quantity,
      price: orders.price,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod,
      transactionId: orders.transactionId,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.whatsapp, customer.phone))
    .orderBy(desc(orders.createdAt))
    .limit(100);

  return NextResponse.json({
    orders: rows.map((row) => ({ ...row, createdAt: new Date(row.createdAt).toISOString() })),
  });
}
