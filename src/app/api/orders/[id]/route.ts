import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { requireAdminJson } from "@/lib/requireAdmin";
import {
  isOrderStatus,
  isPaymentStatus,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orders";

/** PATCH/DELETE /api/orders/:id — admin only. */

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminJson();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isFinite(orderId)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!isOrderStatus(body.status)) {
      return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.paymentStatus !== undefined) {
    if (!isPaymentStatus(body.paymentStatus)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }
    patch.paymentStatus = body.paymentStatus;
  }
  if (typeof body.adminNote === "string") {
    patch.adminNote = body.adminNote.slice(0, 2000);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  patch.statusUpdatedAt = new Date();

  const [updated] = await db
    .update(orders)
    .set(patch)
    .where(eq(orders.id, orderId))
    .returning();
  if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Keep the mirrored payment row consistent so the Payments view agrees.
  if (patch.paymentStatus) {
    const paymentStatus = patch.paymentStatus as string;
    await db
      .update(payments)
      .set({
        status: paymentStatus,
        verifiedAt: paymentStatus === "confirmed" ? new Date() : null,
      })
      .where(eq(payments.orderId, orderId));
  }

  return NextResponse.json({
    order: updated,
    statusLabel: ORDER_STATUS_LABELS[updated.status as keyof typeof ORDER_STATUS_LABELS],
    paymentLabel: PAYMENT_STATUS_LABELS[updated.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS],
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminJson();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  await db.delete(orders).where(eq(orders.id, Number(id)));
  return NextResponse.json({ ok: true });
}
