import crypto from "crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, orders, packages } from "@/db/schema";
import { hashPin, isValidPin } from "./auth";
import { validateCoupon, markCouponUsed } from "./coupons";
import { computePackagePricing, round2, type OrderBreakdown } from "./pricing";
import { isValidBdPhone, normalizePhone } from "./format";

export type CreateOrderInput = {
  packageId: number;
  quantity: number;
  name: string;
  phone: string;
  paymentNumber: string;
  paymentMethod: string;
  transactionId: string;
  couponCode?: string | null;
  screenshotRef?: string | null;
  pin?: string | null;
};

export type CreateOrderSuccess = {
  ok: true;
  duplicate: boolean;
  order: typeof orders.$inferSelect;
  breakdown: OrderBreakdown;
};

export type CreateOrderFailure = { ok: false; status: number; error: string };

export type CreateOrderResult = CreateOrderSuccess | CreateOrderFailure;

const PAYMENT_METHODS = new Set(["bKash", "Nagad", "Rocket"]);

function orderCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i += 1) code += alphabet[bytes[i] % alphabet.length];
  return `BS-${code}`;
}

/**
 * Creates an order from server-verified data only:
 *  - the price comes from the package row in the database (never the client),
 *  - the coupon discount is recalculated here,
 *  - an accidental double submit returns the already created order instead of
 *    creating a second one.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const name = String(input.name ?? "").trim().slice(0, 80);
  const phone = normalizePhone(String(input.phone ?? ""));
  const paymentNumber = normalizePhone(String(input.paymentNumber ?? "")) || phone;
  const transactionId = String(input.transactionId ?? "").trim().slice(0, 60);
  const paymentMethod = PAYMENT_METHODS.has(String(input.paymentMethod))
    ? String(input.paymentMethod)
    : "bKash";
  const quantity = Math.max(1, Math.min(20, Math.floor(Number(input.quantity) || 1)));

  if (!name) return { ok: false, status: 400, error: "Please enter your name." };
  if (!isValidBdPhone(phone)) {
    return { ok: false, status: 400, error: "Please enter a valid WhatsApp number (01XXXXXXXXX)." };
  }
  if (!transactionId) {
    return { ok: false, status: 400, error: "Please enter the payment Transaction ID." };
  }

  const pkgRows = await db
    .select()
    .from(packages)
    .where(eq(packages.id, Number(input.packageId)))
    .limit(1);
  const pkg = pkgRows[0];
  if (!pkg) return { ok: false, status: 404, error: "This package is no longer available." };
  if (!pkg.available) {
    return { ok: false, status: 400, error: "This package is currently unavailable." };
  }

  // ---- duplicate submit guard (same phone + trx id within 15 minutes) ------
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const existing = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.whatsapp, phone),
        sql`lower(${orders.transactionId}) = lower(${transactionId})`,
        gte(orders.createdAt, since),
      ),
    )
    .limit(1);

  if (existing[0]) {
    const pricing = computePackagePricing(pkg);
    return {
      ok: true,
      duplicate: true,
      order: existing[0],
      breakdown: {
        quantity: existing[0].quantity,
        unitOriginal: pricing.originalPrice,
        unitFinal: pricing.finalPrice,
        subtotal: round2(pricing.originalPrice * existing[0].quantity),
        packageDiscount: round2(pricing.discountAmount * existing[0].quantity),
        couponCode: existing[0].couponCode,
        couponDiscount: Number(existing[0].couponDiscount ?? 0),
        total: Number(existing[0].price ?? 0),
      },
    };
  }

  // ---- pricing -------------------------------------------------------------
  const pricing = computePackagePricing(pkg);
  const subtotal = round2(pricing.originalPrice * quantity);
  const packageDiscount = round2(pricing.discountAmount * quantity);
  const afterPackage = round2(pricing.finalPrice * quantity);

  let couponCode: string | null = null;
  let couponDiscountValue = 0;
  let couponId: number | null = null;

  if (input.couponCode) {
    const check = await validateCoupon(input.couponCode, afterPackage);
    if (!check.ok) return { ok: false, status: 400, error: check.reason };
    couponCode = check.coupon.code;
    couponDiscountValue = check.rule.discount;
    couponId = check.coupon.id;
  }

  const total = round2(Math.max(0, afterPackage - couponDiscountValue));

  // ---- customer account (optional PIN so the buyer can track orders) -------
  let customerId: number | null = null;
  let customerName = name;
  const pin = String(input.pin ?? "").trim();

  const existingCustomer = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);

  if (existingCustomer[0]) {
    customerId = existingCustomer[0].id;
    customerName = name || existingCustomer[0].name;
    const patch: Record<string, unknown> = { name: customerName };
    if (pin && isValidPin(pin)) patch.pinHash = hashPin(pin);
    await db.update(customers).set(patch).where(eq(customers.id, customerId));
  } else {
    const [created] = await db
      .insert(customers)
      .values({
        name: customerName,
        phone,
        pinHash: pin && isValidPin(pin) ? hashPin(pin) : "",
      })
      .returning();
    customerId = created?.id ?? null;
  }

  // ---- insert order (retry once if the generated code collides) ------------
  let created: typeof orders.$inferSelect | undefined;
  for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
    try {
      const rows = await db
        .insert(orders)
        .values({
          orderCode: orderCode(),
          customerId,
          customerName,
          whatsapp: phone,
          packageId: pkg.id,
          packageName: pkg.name,
          packageQuantity: pkg.quantityLabel || "",
          quantity,
          unitPrice: pricing.finalPrice.toFixed(2),
          originalPrice: pricing.originalPrice.toFixed(2),
          discountAmount: packageDiscount.toFixed(2),
          couponCode,
          couponDiscount: couponDiscountValue.toFixed(2),
          price: total.toFixed(2),
          paymentMethod,
          paymentNumber,
          transactionId,
          screenshotUrl: input.screenshotRef || "",
          paymentStatus: "pending",
          status: "pending",
        })
        .returning();
      created = rows[0];
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/duplicate|unique/i.test(message)) throw error;
    }
  }

  if (!created) {
    return { ok: false, status: 500, error: "Could not create the order. Please try again." };
  }

  if (couponId) await markCouponUsed(couponId).catch(() => undefined);

  return {
    ok: true,
    duplicate: false,
    order: created,
    breakdown: {
      quantity,
      unitOriginal: pricing.originalPrice,
      unitFinal: pricing.finalPrice,
      subtotal,
      packageDiscount,
      couponCode,
      couponDiscount: couponDiscountValue,
      total,
    },
  };
}
