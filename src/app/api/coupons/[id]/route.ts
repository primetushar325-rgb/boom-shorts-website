import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { coupons } from "@/db/schema";
import { normalizeCouponCode } from "@/lib/coupons";
import { toNumber } from "@/lib/pricing";
import { isAdminAuthed } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const { id } = await params;
  const couponId = Number(id);
  if (!Number.isInteger(couponId)) {
    return NextResponse.json({ error: "Invalid coupon id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if ("code" in body) {
    const code = normalizeCouponCode(body.code);
    if (!code) return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
    patch.code = code;
  }
  if ("discountType" in body) patch.discountType = body.discountType === "fixed" ? "fixed" : "percent";
  if ("discountValue" in body || "discountPercent" in body) {
    const value = Math.max(0, toNumber(body.discountValue ?? body.discountPercent, 0));
    if ((patch.discountType ?? body.discountType) === "percent" && value > 100) {
      return NextResponse.json({ error: "Percentage discount cannot exceed 100%" }, { status: 400 });
    }
    patch.discountValue = String(value);
    patch.discountPercent = Math.round(value);
  }
  if ("minOrder" in body) patch.minOrder = String(Math.max(0, toNumber(body.minOrder, 0)));
  if ("usageLimit" in body) {
    const raw = body.usageLimit;
    patch.usageLimit =
      raw === null || String(raw).trim() === ""
        ? null
        : Math.max(1, Math.floor(Number(raw) || 1));
  }
  if ("active" in body) patch.active = body.active !== false;
  if ("expiresAt" in body) {
    patch.expiresAt = body.expiresAt ? new Date(String(body.expiresAt)) : null;
  }

  const [updated] = await db
    .update(coupons)
    .set(patch)
    .where(eq(coupons.id, couponId))
    .returning();

  if (!updated) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  return NextResponse.json({ coupon: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const { id } = await params;
  const couponId = Number(id);
  if (!Number.isInteger(couponId)) {
    return NextResponse.json({ error: "Invalid coupon id" }, { status: 400 });
  }

  await db.delete(coupons).where(eq(coupons.id, couponId));
  return NextResponse.json({ ok: true });
}
