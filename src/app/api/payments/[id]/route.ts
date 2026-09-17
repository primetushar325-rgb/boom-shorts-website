import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { requireAdminJson } from "@/lib/requireAdmin";
import { isPaymentStatus } from "@/lib/orders";

/** PATCH /api/payments/:id — confirm or reject a payment; mirrors to the order. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminJson();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const paymentId = Number(id);
  if (!Number.isFinite(paymentId)) {
    return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  if (!isPaymentStatus(body.status)) {
    return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
  }

  const [updated] = await db
    .update(payments)
    .set({
      status: body.status,
      verifiedAt: body.status === "confirmed" ? new Date() : null,
      note: typeof body.note === "string" ? body.note.slice(0, 1000) : undefined,
    })
    .where(eq(payments.id, paymentId))
    .returning();

  if (!updated) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  // Keep the parent order's payment status in step.
  await db
    .update(orders)
    .set({
      paymentStatus: updated.status,
      status: updated.status === "confirmed" ? "confirmed" : updated.status === "rejected" ? "rejected" : "pending",
      statusUpdatedAt: new Date(),
    })
    .where(eq(orders.id, updated.orderId));

  return NextResponse.json({ payment: updated });
}
