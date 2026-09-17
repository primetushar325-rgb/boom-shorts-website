import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireAdminJson } from "@/lib/requireAdmin";
import { createOrder, isPaymentMethod } from "@/lib/orders";
import { sendWhatsAppText, whatsappCloudConfigured } from "@/lib/whatsapp";
import { getSettings } from "@/lib/settings";
import { taka } from "@/lib/pricing";

/**
 * GET  /api/orders — admin only, paginated.
 * POST /api/orders — public order placement. The client sends no price;
 *                    every amount is derived from the database server-side.
 */

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const guard = await requireAdminJson();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const status = url.searchParams.get("status") ?? "";
  const search = (url.searchParams.get("q") ?? "").trim();

  const conditions = [];
  if (status && status !== "all") conditions.push(eq(orders.status, status));
  if (search) {
    conditions.push(
      sql`(${orders.orderNumber} ilike ${"%" + search + "%"}
            or ${orders.customerName} ilike ${"%" + search + "%"}
            or ${orders.whatsapp} ilike ${"%" + search + "%"}
            or ${orders.transactionId} ilike ${"%" + search + "%"})`,
    );
  }
  const where = conditions.length ? sql.join(conditions, sql` and `) : undefined;

  const totalRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(where);
  const total = totalRows[0]?.count ?? 0;

  const rows = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return NextResponse.json({
    orders: rows,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const result = await createOrder({
    packageId: Number(body.packageId),
    customerName: String(body.customerName ?? ""),
    whatsapp: String(body.whatsapp ?? ""),
    paymentMethod: isPaymentMethod(body.paymentMethod) ? body.paymentMethod : "bKash",
    transactionId: String(body.transactionId ?? ""),
    senderNumber: body.senderNumber ? String(body.senderNumber) : undefined,
    couponCode: body.couponCode ? String(body.couponCode) : null,
    screenshotPath: body.screenshotPath ? String(body.screenshotPath) : "",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }

  // Optional automatic WhatsApp notifications. When the Cloud API is not
  // configured this whole block is a no-op and the customer uses the prefilled
  // wa.me link on the success page instead — the existing flow is preserved.
  //
  // Two messages go out: a confirmation to the customer, and the full order
  // details to the business number from Site Settings. Both are fire-and-forget
  // with their own catch, so a WhatsApp outage can never fail an order that has
  // already been written to the database.
  if (whatsappCloudConfigured()) {
    const customerNote = [
      `✅ Order ${result.orderNumber} received!`,
      `Package: ${result.packageName}`,
      `Amount: ${taka(result.finalAmount)}`,
      `Status: ${result.statusLabel}`,
      "We will verify your payment shortly.",
    ].join("\n");

    const businessNote = [
      `🧾 New order ${result.orderNumber}`,
      `Customer: ${String(body.customerName ?? "").trim() || "—"}`,
      `WhatsApp: ${String(body.whatsapp ?? "")}`,
      `Package: ${result.packageName}`,
      `Amount: ${taka(result.finalAmount)}`,
      `Method: ${result.paymentMethod}`,
      `Txn ID: ${result.transactionId || "—"}`,
      `Status: ${result.statusLabel}`,
    ].join("\n");

    const businessNumber = await getSettings()
      .then((s) => s.whatsappNumber)
      .catch(() => null);

    const [toCustomer, toBusiness] = await Promise.all([
      sendWhatsAppText(String(body.whatsapp), customerNote).catch(() => false),
      businessNumber
        ? sendWhatsAppText(businessNumber, businessNote).catch(() => false)
        : Promise.resolve(false),
    ]);

    if (!toCustomer) console.warn(`[orders] customer WhatsApp notification not sent for ${result.orderNumber}`);
    if (businessNumber && !toBusiness) {
      console.warn(`[orders] business WhatsApp notification not sent for ${result.orderNumber}`);
    }
  }

  return NextResponse.json(
    {
      orderNumber: result.orderNumber,
      orderId: result.orderId,
      finalAmount: result.finalAmount,
      status: result.statusLabel,
    },
    { status: 201 },
  );
}
