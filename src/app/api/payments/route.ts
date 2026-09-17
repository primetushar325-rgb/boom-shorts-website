import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { requireAdminJson } from "@/lib/requireAdmin";

/** GET /api/payments — admin only, paginated, joined to its order. */
export async function GET(req: NextRequest) {
  const guard = await requireAdminJson();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const pageSize = 25;

  const rows = await db
    .select({
      id: payments.id,
      orderId: payments.orderId,
      orderNumber: orders.orderNumber,
      customerName: orders.customerName,
      method: payments.method,
      transactionId: payments.transactionId,
      senderNumber: payments.senderNumber,
      amount: payments.amount,
      status: payments.status,
      screenshotPath: payments.screenshotPath,
      verifiedAt: payments.verifiedAt,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .leftJoin(orders, eq(payments.orderId, orders.id))
    .orderBy(desc(payments.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({ payments: rows, page, pageSize });
}
