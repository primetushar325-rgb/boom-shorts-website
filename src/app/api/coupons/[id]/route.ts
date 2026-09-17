import { NextRequest, NextResponse } from "next/server";
import { coupons } from "@/db/schema";
import {
  adminDelete,
  adminPatch,
  asBool,
  asDateOrNull,
  asInt,
  asNumeric,
  asText,
  buildPatch,
  type FieldSpec,
} from "@/lib/adminCrud";

/**
 * Explicit allowlist.
 *
 * The previous implementation did `const patch = { ...body }`, which let a
 * request write any column on the table. Every field the admin editor sends is
 * listed here; anything else is dropped by buildPatch().
 */
const SPEC: FieldSpec = {
  code: asText(40),
  discountPercent: asInt(0),
  discountAmount: asNumeric(),
  minOrderAmount: asNumeric(),
  usageLimit: asInt(0),
  active: asBool(true),
  expiresAt: asDateOrNull(),
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rowId = Number(id);
  if (!Number.isFinite(rowId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return adminPatch(coupons, rowId, buildPatch(body, SPEC), "coupon");
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return adminDelete(coupons, Number(id));
}
