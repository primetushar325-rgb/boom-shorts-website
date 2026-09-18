import { NextRequest, NextResponse } from "next/server";
import { ensureSchema } from "@/db/ensureSchema";
import { rateLimit } from "@/lib/auth";
import { validateCoupon } from "@/lib/coupons";
import { toNumber } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * Validates a coupon server-side. The discount shown to the customer is the one
 * computed here — and it is recomputed again when the order is created, so a
 * tampered payload cannot change the payable amount.
 */
export async function POST(req: NextRequest) {
  await ensureSchema();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!rateLimit(`coupon:${ip}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json(
      { valid: false, error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const amount = Math.max(0, toNumber(body.amount, 0));

  const result = await validateCoupon(body.code, amount);
  if (!result.ok) {
    return NextResponse.json({ valid: false, error: result.reason }, { status: 200 });
  }

  return NextResponse.json({
    valid: true,
    code: result.coupon.code,
    discountType: result.coupon.discountType,
    discountPercent:
      result.coupon.discountType === "fixed"
        ? 0
        : Number(result.coupon.discountValue || result.coupon.discountPercent),
    discount: result.rule.discount,
    label: result.rule.label,
  });
}
