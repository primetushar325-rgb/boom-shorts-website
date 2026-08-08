import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "").toUpperCase().trim();
  if (!code) return NextResponse.json({ valid: false });

  const rows = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  const coupon = rows[0];

  if (!coupon || !coupon.active) return NextResponse.json({ valid: false });
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({ valid: true, discountPercent: coupon.discountPercent, code: coupon.code });
}
