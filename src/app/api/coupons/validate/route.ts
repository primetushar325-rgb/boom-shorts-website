import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { couponDiscount, toNumber, taka } from "@/lib/pricing";

/**
 * POST /api/coupons/validate — public, rate-limited by shape only.
 *
 * Returns whether a coupon applies and how much it saves for the given cart
 * amount. It never returns the full coupon row.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "").toUpperCase().trim();
  const amount = toNumber(body.amount);

  const invalid = { valid: false, error: "That coupon code is not valid." };
  if (!code || code.length > 32) return NextResponse.json(invalid);

  const rows = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  const coupon = rows[0];

  if (!coupon || !coupon.active) return NextResponse.json(invalid);
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ valid: false, error: "That coupon code has expired." });
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return NextResponse.json({ valid: false, error: "That coupon code has reached its usage limit." });
  }
  if (amount > 0 && toNumber(coupon.minOrderAmount) > amount) {
    return NextResponse.json({
      valid: false,
      error: `This coupon needs a minimum order of ${taka(coupon.minOrderAmount)}.`,
    });
  }

  const discount = amount > 0 ? couponDiscount({ base: amount, discountPercent: coupon.discountPercent, discountAmount: coupon.discountAmount }) : 0;

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    discount,
    note:
      coupon.discountAmount && toNumber(coupon.discountAmount) > 0
        ? `${taka(coupon.discountAmount)} off applied`
        : `${coupon.discountPercent}% off applied`,
  });
}
