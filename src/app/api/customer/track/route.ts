import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { orders } from "@/db/schema";
import { rateLimit } from "@/lib/auth";
import { isValidBdPhone, normalizePhone } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Guest order tracking: Order ID + the WhatsApp number used for that order.
 * Only the matching order is returned — never a list, never another customer's
 * data. Rate limited to make guessing impractical.
 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "We could not read the request. Please try again." },
      { status: 400 },
    );
  }

  const code = String(body.orderCode ?? "").trim().toUpperCase();
  const phone = normalizePhone(String(body.phone ?? ""));

  // Validation first — a malformed lookup must not consume the rate budget.
  if (!code || !isValidBdPhone(phone)) {
    return NextResponse.json(
      { error: "Enter your Order ID and the WhatsApp number used for that order." },
      { status: 400 },
    );
  }

  if (!rateLimit(`track:${ip}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  await ensureSchema();

  try {
    const rows = await db
      .select({
        id: orders.id,
        orderCode: orders.orderCode,
        packageName: orders.packageName,
        packageQuantity: orders.packageQuantity,
        quantity: orders.quantity,
        unitPrice: orders.unitPrice,
        originalPrice: orders.originalPrice,
        discountAmount: orders.discountAmount,
        couponCode: orders.couponCode,
        couponDiscount: orders.couponDiscount,
        price: orders.price,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        paymentNumber: orders.paymentNumber,
        transactionId: orders.transactionId,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(sql`upper(${orders.orderCode}) = ${code}`, eq(orders.whatsapp, phone)))
      .limit(1);

    const order = rows[0];
    if (!order) {
      return NextResponse.json(
        { error: "No order found for that Order ID and number." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      order: { ...order, createdAt: new Date(order.createdAt).toISOString() },
    });
  } catch (error) {
    console.error("[customer-track] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "We could not look up that order right now. Please try again in a minute." },
      { status: 500 },
    );
  }
}
