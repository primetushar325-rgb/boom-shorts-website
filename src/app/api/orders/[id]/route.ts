import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { orders } from "@/db/schema";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/constants";
import { isAdminAuthed } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.status === "string") {
    if (!ORDER_STATUSES.includes(body.status as (typeof ORDER_STATUSES)[number])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status;
  }

  if (typeof body.paymentStatus === "string") {
    if (!PAYMENT_STATUSES.includes(body.paymentStatus as (typeof PAYMENT_STATUSES)[number])) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }
    patch.paymentStatus = body.paymentStatus;
    // Verifying a payment moves a pending order forward automatically.
    if (body.paymentStatus === "verified" && !patch.status && body.keepStatus !== true) {
      patch.status = "payment_verified";
    }
    if (body.paymentStatus === "rejected" && !patch.status && body.keepStatus !== true) {
      patch.status = "rejected";
    }
  }

  if (typeof body.adminNote === "string") patch.adminNote = body.adminNote.slice(0, 500);

  const [updated] = await db
    .update(orders)
    .set(patch)
    .where(eq(orders.id, orderId))
    .returning();

  if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ order: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  await db.delete(orders).where(eq(orders.id, orderId));
  return NextResponse.json({ ok: true });
}
