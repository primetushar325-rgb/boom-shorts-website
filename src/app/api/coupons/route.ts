import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { coupons } from "@/db/schema";
import { normalizeCouponCode } from "@/lib/coupons";
import { toNumber } from "@/lib/pricing";
import { isAdminAuthed } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();
  const rows = await db.select().from(coupons).orderBy(desc(coupons.id));
  return NextResponse.json({ coupons: rows });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const code = normalizeCouponCode(body.code);
  if (!code) return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });

  const discountType = body.discountType === "fixed" ? "fixed" : "percent";
  const discountValue = Math.max(0, toNumber(body.discountValue ?? body.discountPercent, 0));

  if (discountType === "percent" && discountValue > 100) {
    return NextResponse.json({ error: "Percentage discount cannot exceed 100%" }, { status: 400 });
  }

  const usageLimitRaw = body.usageLimit;
  const usageLimit =
    usageLimitRaw === null || usageLimitRaw === undefined || String(usageLimitRaw).trim() === ""
      ? null
      : Math.max(1, Math.floor(Number(usageLimitRaw) || 1));

  try {
    const [created] = await db
      .insert(coupons)
      .values({
        code,
        discountType,
        discountValue: String(discountValue),
        discountPercent: discountType === "percent" ? Math.round(discountValue) : 0,
        minOrder: String(Math.max(0, toNumber(body.minOrder, 0))),
        usageLimit,
        active: body.active !== false,
        expiresAt: body.expiresAt ? new Date(String(body.expiresAt)) : null,
      })
      .returning();

    return NextResponse.json({ coupon: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 });
  }
}
