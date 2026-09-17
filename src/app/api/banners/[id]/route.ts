import { NextRequest, NextResponse } from "next/server";
import { banners } from "@/db/schema";
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
  title: asText(160),
  subtitle: asText(300),
  imageUrl: asText(600),
  link: asText(600),
  buttonText: asText(40),
  buttonLink: asText(600),
  type: asText(20),
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
  return adminPatch(banners, rowId, buildPatch(body, SPEC), "banner");
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return adminDelete(banners, Number(id));
}
