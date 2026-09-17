import { NextRequest, NextResponse } from "next/server";
import { testimonials } from "@/db/schema";
import {
  adminDelete,
  adminPatch,
  asBool,
  asInt,
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
  name: asText(120),
  avatarUrl: asText(600),
  message: asText(2000),
  rating: asInt(5),
  approved: asBool(),
  visible: asBool(true),
  sortOrder: asInt(0),
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rowId = Number(id);
  if (!Number.isFinite(rowId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return adminPatch(testimonials, rowId, buildPatch(body, SPEC), "testimonial");
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return adminDelete(testimonials, Number(id));
}
