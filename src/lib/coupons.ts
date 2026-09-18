import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { couponDiscount, toNumber, type CouponRule } from "./pricing";

export type CouponRecord = typeof coupons.$inferSelect;

export type CouponCheck =
  | { ok: true; coupon: CouponRecord; rule: Extract<CouponRule, { ok: true }> }
  | { ok: false; reason: string };

export function normalizeCouponCode(code: unknown): string {
  return String(code ?? "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}

/** Server-side coupon validation — the browser can never decide the discount. */
export async function validateCoupon(code: unknown, amount: number): Promise<CouponCheck> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return { ok: false, reason: "Enter a coupon code" };

  const rows = await db.select().from(coupons).where(eq(coupons.code, normalized)).limit(1);
  const coupon = rows[0];
  if (!coupon) return { ok: false, reason: "Invalid coupon code" };
  if (!coupon.active) return { ok: false, reason: "This coupon is not active" };
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "This coupon has expired" };
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, reason: "This coupon has reached its usage limit" };
  }

  const rule = couponDiscount(coupon, amount);
  if (!rule.ok) return { ok: false, reason: rule.reason };

  return { ok: true, coupon, rule };
}

export async function markCouponUsed(id: number): Promise<void> {
  await db
    .update(coupons)
    .set({ usedCount: sql`${coupons.usedCount} + 1` })
    .where(eq(coupons.id, id));
}

/** Active coupons for the admin list / public offer strip. */
export async function listActiveCoupons(): Promise<CouponRecord[]> {
  return db
    .select()
    .from(coupons)
    .where(
      and(
        eq(coupons.active, true),
        or(isNull(coupons.expiresAt), gt(coupons.expiresAt, new Date())),
      ),
    )
    .orderBy(desc(coupons.createdAt));
}

export function couponAmount(coupon: CouponRecord, amount: number): number {
  const rule = couponDiscount(coupon, amount);
  return rule.ok ? rule.discount : 0;
}

export { toNumber };
