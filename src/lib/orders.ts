import crypto from "crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, orderIdempotencyKeys, orders, packages } from "@/db/schema";
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
  note?: string | null;
};

export type CreateOrderSuccess = {
  ok: true;
  duplicate: boolean;
  order: typeof orders.$inferSelect;
  breakdown: OrderBreakdown;
};

export type CreateOrderFailure = {
  ok: false;
  status: number;
  error: string;
  /** Lets the route log/branch without parsing the human-readable message. */
  code: "validation" | "not_found" | "unavailable" | "coupon" | "conflict" | "internal";
};

export type CreateOrderResult = CreateOrderSuccess | CreateOrderFailure;

const PAYMENT_METHODS = new Set(["bKash", "Nagad", "Rocket"]);
const MAX_NOTE_LENGTH = 500;

/** Sentinel used to roll the transaction back when another request won. */
class DuplicatePayment extends Error {
  constructor() {
    super("duplicate-payment");
    this.name = "DuplicatePayment";
  }
}

function orderCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i += 1) code += alphabet[bytes[i] % alphabet.length];
  return `BS-${code}`;
}

/** One payment = one order. The key is claimed with a PRIMARY KEY insert. */
export function idempotencyKeyFor(phone: string, transactionId: string): string {
  return `${phone}|${transactionId.trim().toLowerCase()}`;
}

function isUniqueViolation(error: unknown): boolean {
  const candidate = error as { code?: string; cause?: { code?: string }; message?: string };
  if (candidate?.code === "23505" || candidate?.cause?.code === "23505") return true;
  return /duplicate key value|unique constraint|duplicate/i.test(String(candidate?.message ?? ""));
}

function constraintNameOf(error: unknown): string {
  const candidate = error as {
    constraint_name?: string;
    constraint?: string;
    cause?: { constraint_name?: string; constraint?: string };
    message?: string;
  };
  const direct = candidate?.constraint_name ?? candidate?.constraint;
  if (direct) return String(direct);
  const nested = candidate?.cause?.constraint_name ?? candidate?.cause?.constraint;
  if (nested) return String(nested);
  const match = String(candidate?.message ?? "").match(/"([a-z0-9_]+_(?:pkey|uidx|key|idx))"/i);
  return match?.[1] ?? "";
}

/**
 * Reads an already-created order back so a duplicate submit returns cleanly.
 *
 * A key whose order row no longer exists (an admin deleted the order) is stale:
 * it is removed here so the same payment can be submitted again instead of
 * being rejected forever by a claim that points at nothing.
 */
async function findOrderByIdempotencyKey(key: string) {
  const claim = await db
    .select({ orderId: orderIdempotencyKeys.orderId })
    .from(orderIdempotencyKeys)
    .where(eq(orderIdempotencyKeys.idempotencyKey, key))
    .limit(1);
  if (!claim[0]) return null;
  const rows = await db.select().from(orders).where(eq(orders.id, claim[0].orderId)).limit(1);
  if (rows[0]) return rows[0];

  await db
    .delete(orderIdempotencyKeys)
    .where(eq(orderIdempotencyKeys.idempotencyKey, key))
    .catch(() => undefined);
  return null;
}

function duplicateResult(order: typeof orders.$inferSelect, pricing: ReturnType<typeof computePackagePricing>): CreateOrderSuccess {
  return {
    ok: true,
    duplicate: true,
    order,
    breakdown: {
      quantity: order.quantity,
      unitOriginal: pricing.originalPrice,
      unitFinal: pricing.finalPrice,
      subtotal: round2(pricing.originalPrice * order.quantity),
      packageDiscount: round2(pricing.discountAmount * order.quantity),
      couponCode: order.couponCode,
      couponDiscount: Number(order.couponDiscount ?? 0),
      total: Number(order.price ?? 0),
    },
  };
}

/**
 * Resolves (or creates) the customer account behind an order.
 *
 * This is deliberately best-effort: the account/PIN is a convenience for order
 * tracking and must NEVER be able to fail an otherwise valid order. Two
 * simultaneous checkouts for the same number used to race into the unique index
 * on `customers.phone` and turn a perfectly good order into a 500 — the insert
 * is now conflict-safe and any failure is logged and ignored.
 */
async function resolveCustomer(params: {
  name: string;
  phone: string;
  pin: string;
}): Promise<number | null> {
  const { name, phone, pin } = params;
  const pinHash = pin && isValidPin(pin) ? await hashPin(pin) : "";

  try {
    const existing = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.phone, phone))
      .limit(1);

    if (existing[0]) {
      const patch: Record<string, unknown> = { name };
      if (pinHash) patch.pinHash = pinHash;
      await db.update(customers).set(patch).where(eq(customers.id, existing[0].id));
      return existing[0].id;
    }

    // Conflict-safe: a concurrent request may have inserted the same phone
    // between the SELECT above and this INSERT.
    const inserted = await db
      .insert(customers)
      .values({ name, phone, pinHash })
      .onConflictDoNothing({ target: customers.phone })
      .returning({ id: customers.id });

    if (inserted[0]) return inserted[0].id;

    const retry = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.phone, phone))
      .limit(1);
    return retry[0]?.id ?? null;
  } catch (error) {
    // Never propagate: the order itself is what matters.
    console.warn(
      "[orders] customer account step failed (order continues):",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Creates an order from server-verified data only:
 *  - the price comes from the package row in the database (never the client),
 *  - the coupon discount is recalculated here,
 *  - one payment (same WhatsApp number + same transaction ID) can only ever
 *    produce one order, enforced by a database PRIMARY KEY claim — not by a
 *    read-then-write check that two simultaneous requests can both pass.
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
  const note = String(input.note ?? "").trim().slice(0, MAX_NOTE_LENGTH);

  // ---- validation (cheap, before any database work) ------------------------
  if (!name) {
    return { ok: false, status: 400, code: "validation", error: "Please enter your name." };
  }
  if (!isValidBdPhone(phone)) {
    return {
      ok: false,
      status: 400,
      code: "validation",
      error: "Please enter a valid WhatsApp number (01XXXXXXXXX).",
    };
  }
  if (!transactionId) {
    return {
      ok: false,
      status: 400,
      code: "validation",
      error: "Please enter the payment Transaction ID.",
    };
  }

  const packageId = Number(input.packageId);
  if (!Number.isInteger(packageId) || packageId <= 0) {
    return {
      ok: false,
      status: 400,
      code: "validation",
      error: "Please choose a package before ordering.",
    };
  }

  const pkgRows = await db
    .select()
    .from(packages)
    .where(eq(packages.id, packageId))
    .limit(1);
  const pkg = pkgRows[0];
  if (!pkg) {
    return {
      ok: false,
      status: 404,
      code: "not_found",
      error: "This package is no longer available.",
    };
  }
  if (!pkg.available) {
    return {
      ok: false,
      status: 409,
      code: "unavailable",
      error: "This package is currently unavailable.",
    };
  }

  const pricing = computePackagePricing(pkg);
  const key = idempotencyKeyFor(phone, transactionId);

  // ---- duplicate submit: fast paths (no write attempted) -------------------
  const byKey = await findOrderByIdempotencyKey(key);
  if (byKey) return duplicateResult(byKey, pricing);

  // Orders created before the idempotency table existed have no key row, so the
  // original short time-window check is kept as a second net.
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const legacy = await db
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
  if (legacy[0]) return duplicateResult(legacy[0], pricing);

  // ---- pricing -------------------------------------------------------------
  const subtotal = round2(pricing.originalPrice * quantity);
  const packageDiscount = round2(pricing.discountAmount * quantity);
  const afterPackage = round2(pricing.finalPrice * quantity);

  let couponCode: string | null = null;
  let couponDiscountValue = 0;
  let couponId: number | null = null;

  if (input.couponCode) {
    const check = await validateCoupon(input.couponCode, afterPackage);
    if (!check.ok) {
      return { ok: false, status: 400, code: "coupon", error: check.reason };
    }
    couponCode = check.coupon.code;
    couponDiscountValue = check.rule.discount;
    couponId = check.coupon.id;
  }

  const total = round2(Math.max(0, afterPackage - couponDiscountValue));

  // ---- customer account (optional PIN so the buyer can track orders) -------
  const customerId = await resolveCustomer({
    name,
    phone,
    pin: String(input.pin ?? "").trim(),
  });

  // ---- insert order + claim the payment, atomically ------------------------
  // Retried only when the generated order code itself collides (astronomically
  // rare); a payment-key collision means another request already won.
  let created: typeof orders.$inferSelect | undefined;

  for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
    try {
      created = await db.transaction(async (tx) => {
        const rows = await tx
          .insert(orders)
          .values({
            orderCode: orderCode(),
            customerId,
            customerName: name,
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
            customerNote: note,
            paymentStatus: "pending",
            status: "pending",
          })
          .returning();
        const order = rows[0];
        if (!order) throw new Error("order insert returned no row");

        // ON CONFLICT DO NOTHING blocks until the other transaction finishes,
        // then the read below tells us who actually owns this payment.
        await tx
          .insert(orderIdempotencyKeys)
          .values({ idempotencyKey: key, orderId: order.id })
          .onConflictDoNothing({ target: orderIdempotencyKeys.idempotencyKey });

        const [claim] = await tx
          .select({ orderId: orderIdempotencyKeys.orderId })
          .from(orderIdempotencyKeys)
          .where(eq(orderIdempotencyKeys.idempotencyKey, key))
          .limit(1);

        if (!claim || claim.orderId !== order.id) throw new DuplicatePayment();
        return order;
      });
    } catch (error) {
      if (error instanceof DuplicatePayment) {
        const winner = await findOrderByIdempotencyKey(key);
        if (winner) return duplicateResult(winner, pricing);
        // Somebody else owns this payment but the row is not readable yet —
        // never create a second order for the same payment.
        return {
          ok: false,
          status: 409,
          code: "conflict",
          error: "This payment was already submitted. Please check your order list.",
        };
      }

      const constraint = constraintNameOf(error);
      if (isUniqueViolation(error) && /order_code/i.test(constraint)) {
        continue; // regenerate the order code
      }
      if (isUniqueViolation(error) && /idempotency/i.test(constraint)) {
        const winner = await findOrderByIdempotencyKey(key);
        if (winner) return duplicateResult(winner, pricing);
      }
      throw error;
    }
  }

  if (!created) {
    return {
      ok: false,
      status: 409,
      code: "conflict",
      error: "This payment was already submitted. Please check your order list.",
    };
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
