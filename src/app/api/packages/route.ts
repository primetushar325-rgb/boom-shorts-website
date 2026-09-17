import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { packages } from "@/db/schema";
import { requireAdminJson } from "@/lib/requireAdmin";
import { withFeatures } from "@/lib/packages";
import { adminInsert, applySortOrder, asBool, asInt, asNumeric, asText, badRequest, buildPatch } from "@/lib/adminCrud";

const SPEC = {
  category: asText(20),
  name: asText(160),
  description: asText(4000),
  shortDescription: asText(300),
  durationLabel: asText(60),
  videoQuantity: asInt(0),
  youtubeDemoUrl: asText(600),
  oldPrice: asNumeric(),
  newPrice: asNumeric(),
  discountPercent: asInt(0),
  discountAmount: asNumeric(),
  badge: asText(20),
  isBestSeller: asBool(),
  buttonText: asText(40),
  icon: asText(16),
  visible: asBool(true),
  available: asBool(true),
  archived: asBool(),
  recentlyAdded: asBool(),
  sortOrder: asInt(0),
};

/**
 * GET  /api/packages?all=1  — admin list (includes hidden packages)
 * GET  /api/packages        — public list (homepage order, non-archived only)
 * POST /api/packages        — admin create
 * POST /api/packages?reorder=1 — admin reorder (body: { ids: number[] })
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdminJson();
  const all = new URL(req.url).searchParams.get("all");

  if (admin.ok && all) {
    const rows = await db
      .select()
      .from(packages)
      .where(asc(packages.archived) as never)
      .orderBy(asc(packages.sortOrder), asc(packages.id));
    const list = rows.filter((p) => !p.archived);
    return NextResponse.json({ packages: await withFeatures(list) });
  }

  const rows = await db.select().from(packages).orderBy(asc(packages.sortOrder), asc(packages.id));
  const list = rows.filter((p) => !p.archived && p.visible);
  return NextResponse.json({ packages: await withFeatures(list) });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminJson();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));

  // Reordering is a POST with { ids: [...] } — an explicit ordering array.
  if (body && Array.isArray(body.ids)) {
    const count = await applySortOrder(packages, body.ids as number[]);
    return NextResponse.json({ ok: true, updated: count });
  }

  const patch = buildPatch(body, SPEC);
  if (!patch.name || !String(patch.name).trim()) return badRequest("Package name is required.");
  if (patch.newPrice === undefined) return badRequest("Price is required.");

  const { created } = await adminInsert(packages, {
    category: "boom",
    buttonText: "Order Now",
    icon: "🎬",
    ...patch,
    updatedAt: new Date(),
  });
  return NextResponse.json({ package: created }, { status: 201 });
}
