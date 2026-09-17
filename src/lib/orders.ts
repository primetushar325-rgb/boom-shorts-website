import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, coupons, orderItems, orders, packages, payments } from "@/db/schema";
import { couponDiscount, finalPriceOf, priceBreakdown, round2, taka } from "./pricing";
import {
  formatOrderNumber,
  isOrderStatus,
  isPaymentMethod,
  isPaymentStatus,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "./orderStatus";

export {
  formatOrderNumber,
  isOrderStatus,
  isPaymentMethod,
  isPaymentStatus,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
};
export type { OrderStatus, PaymentMethod, PaymentStatus };
import { normalizePhone } from "./whatsapp";

/**
 * Order creation — the single write path for customer orders.
 *
 * The client sends ONLY: packageId, customer name, whatsapp, payment method,
 * transaction id, optional coupon code and an optional screenshot path.
 *
 * It never sends a price. Every amount is derived here from the database row,
 * inside one transaction, so the number stored is the number the admin sees.
 */

export async function generateOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const n = 100000 + Math.floor(Math.random() * 900000);
    const candidate = formatOrderNumber(n);
    const existing = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.orderNumber, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
  }
  // Deterministic fallback derived from the sequence — still unique.
  const res = await db.execute(sql`select nextval(pg_get_serial_sequence('orders','id'))::int as next`);
  const next = Number((res.rows[0] as { next?: number } | undefined)?.next ?? 0);
  return formatOrderNumber(next > 0 ? next : Date.now() % 900000);
}

export type CreateOrderInput = {
  packageId: number;
  customerName: string;
  whatsapp: string;
  paymentMethod: PaymentMethod;
  transactionId: string;
  senderNumber?: string;
  couponCode?: string | null;
  screenshotPath?: string;
};

export type CreateOrderResult =
  | {
      ok: true;
      orderNumber: string;
      orderId: number;
      packageName: string;
      basePrice: number;
      discountTotal: number;
      finalAmount: number;
      paymentMethod: PaymentMethod;
      transactionId: string;
      statusLabel: string;
    }
  | { ok: false; error: string; status?: number };

function bad(error: string, status = 400): CreateOrderResult {
  return { ok: false, error, status };
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  // ---- validation -------------------------------------------------------
  const customerName = String(input.customerName || "").trim().slice(0, 120);
  const whatsapp = normalizePhone(String(input.whatsapp || ""));
  const transactionId = String(input.transactionId || "").trim().slice(0, 120);
  const senderNumber = normalizePhone(String(input.senderNumber || ""));

  if (customerName.length < 2) return bad("Please enter your full name.");
  if (!/^\d{10,15}$/.test(whatsapp)) {
    return bad("Please enter a valid WhatsApp number (e.g. 01712345678).");
  }
  if (transactionId.length < 4) {
    return bad("Please enter the Transaction ID from your payment SMS.");
  }
  if (!isPaymentMethod(input.paymentMethod)) return bad("Please choose bKash or Nagad.");

  // ---- authoritative package load ---------------------------------------
  const [pkg] = await db.select().from(packages).where(eq(packages.id, input.packageId)).limit(1);
  if (!pkg) return bad("This package no longer exists.", 404);
  if (pkg.archived) return bad("This package is no longer available.", 410);
  if (!pkg.available) return bad("This package is currently unavailable. Please choose another.", 409);

  const breakdown = priceBreakdown(pkg);
  const basePrice = breakdown.base;
  if (basePrice <= 0) return bad("This package has no price configured yet. Please contact support.", 409);

  // ---- coupon (validated server-side against the live row) ---------------
  let couponRow: typeof coupons.$inferSelect | null = null;
  const rawCode = String(input.couponCode || "").toUpperCase().trim();
  if (rawCode) {
    const [found] = await db.select().from(coupons).where(eq(coupons.code, rawCode)).limit(1);
    if (!found) return bad("That coupon code is not valid.");
    if (!found.active) return bad("That coupon code is no longer active.");
    if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) {
      return bad("That coupon code has expired.");
    }
    if (found.usageLimit !== null && found.usedCount >= found.usageLimit) {
      return bad("That coupon code has reached its usage limit.");
    }
    if (Number(found.minOrderAmount) > basePrice) {
      return bad(`This coupon needs a minimum order of ${taka(found.minOrderAmount)}.`);
    }
    couponRow = found;
  }

  const couponOff = couponRow
    ? couponDiscount({
        base: breakdown.final,
        discountPercent: couponRow.discountPercent,
        discountAmount: couponRow.discountAmount,
      })
    : 0;

  const discountTotal = round2(Math.min(breakdown.final, breakdown.discount + couponOff));
  const finalAmount = round2(Math.max(0, breakdown.final - couponOff));
  if (finalAmount <= 0) return bad("This order cannot be completed at zero amount. Please contact support.", 409);

  // ---- duplicate transaction guard --------------------------------------
  const [dupe] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.method, input.paymentMethod), eq(payments.transactionId, transactionId)))
    .limit(1);
  if (dupe) {
    return bad("This Transaction ID has already been used. Please use a new payment.", 409);
  }

  // ---- write, in one transaction ----------------------------------------
  // The order number is allocated BEFORE the transaction opens, because
  // generateOrderNumber() reads through the outer db handle and must not run
  // while the transaction holds the connection.
  const orderNumber = await generateOrderNumber();

  try {
    const result = await db.transaction(async (tx) => {
      // Upsert the customer, deduped by WhatsApp number.
      const [existingCustomer] = await tx
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.whatsapp, whatsapp))
        .limit(1);

      let customerId: number;
      if (existingCustomer) {
        customerId = existingCustomer.id;
        await tx
          .update(customers)
          .set({ name: customerName })
          .where(eq(customers.id, customerId));
      } else {
        const [created] = await tx
          .insert(customers)
          .values({ name: customerName, whatsapp })
          .onConflictDoNothing()
          .returning({ id: customers.id });
        if (created) {
          customerId = created.id;
        } else {
          const [reread] = await tx
            .select({ id: customers.id })
            .from(customers)
            .where(eq(customers.whatsapp, whatsapp))
            .limit(1);
          customerId = reread.id;
        }
      }

      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          customerId,
          customerName,
          whatsapp,
          packageId: pkg.id,
          packageName: pkg.name,
          // Legacy column kept in sync so old reports keep working.
          price: String(finalAmount),
          basePrice: String(basePrice),
          discountAmount: String(discountTotal),
          finalAmount: String(finalAmount),
          couponCode: couponRow ? couponRow.code : null,
          paymentMethod: input.paymentMethod,
          transactionId,
          screenshotUrl: input.screenshotPath || "",
          status: "pending",
          paymentStatus: "unverified",
          statusUpdatedAt: new Date(),
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values({
        orderId: order.id,
        packageId: pkg.id,
        packageName: pkg.name,
        quantity: 1,
        unitPrice: String(basePrice),
        discountAmount: String(discountTotal),
        lineTotal: String(finalAmount),
      });

      await tx.insert(payments).values({
        orderId: order.id,
        method: input.paymentMethod,
        transactionId,
        senderNumber: senderNumber || whatsapp,
        amount: String(finalAmount),
        screenshotPath: input.screenshotPath || "",
        status: "unverified",
      });

      if (couponRow) {
        await tx
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(eq(coupons.id, couponRow.id));
      }

      return { orderNumber, orderId: order.id };
    });

    return {
      ok: true,
      orderNumber: result.orderNumber,
      orderId: result.orderId,
      packageName: pkg.name,
      basePrice,
      discountTotal,
      finalAmount,
      paymentMethod: input.paymentMethod,
      transactionId,
      statusLabel: ORDER_STATUS_LABELS.pending,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // The unique index on (method, transaction_id) is the last line of defence
    // against a double-tapped submit racing the SELECT above.
    if (/duplicate key|payments_txn_uidx/i.test(message)) {
      return bad("This Transaction ID has already been used. Please use a new payment.", 409);
    }
    console.error("[orders] create failed:", message);
    return bad("We could not place your order. Please try again.", 500);
  }
}

/** Price a package for display on the checkout page — same math, read-only. */
export function quotePackage(pkg: typeof packages.$inferSelect) {
  return {
    ...priceBreakdown(pkg),
    final: finalPriceOf(pkg),
  };
}
