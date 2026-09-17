import { NextRequest, NextResponse } from "next/server";
import { sections } from "@/db/schema";
import {
  adminDelete,
  adminPatch,
  asBool,
  asInt,
  asJson,
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
  videoUrl: asText(600),
  videoThumbnailUrl: asText(600),
  items: asJson([]),
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
  return adminPatch(sections, rowId, buildPatch(body, SPEC), "section");
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return adminDelete(sections, Number(id));
}
