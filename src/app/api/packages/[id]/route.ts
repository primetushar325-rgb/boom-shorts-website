import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { packageFeatures, packages } from "@/db/schema";
import { requireAdminJson } from "@/lib/requireAdmin";
import { adminDelete, adminPatch, asBool, asInt, asNumeric, asText, buildPatch } from "@/lib/adminCrud";

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

/** PATCH/DELETE /api/packages/:id — admin only. */

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminJson();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const packageId = Number(id);
  if (!Number.isFinite(packageId)) {
    return NextResponse.json({ error: "Invalid package id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const patch = buildPatch(body, SPEC);

  // Features are replaced wholesale when supplied — simplest correct semantics
  // for the admin editor's add/remove list.
  if (Array.isArray(body.features)) {
    const labels = (body.features as unknown[])
      .map((f) => (typeof f === "string" ? f : String((f as { label?: string })?.label ?? "")))
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);

    await db.delete(packageFeatures).where(eq(packageFeatures.packageId, packageId));
    if (labels.length) {
      await db.insert(packageFeatures).values(
        labels.map((label, idx) => ({ packageId, label, sortOrder: idx })),
      );
    }
  }

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = new Date();
    return adminPatch(packages, packageId, patch, "package");
  }

  const [row] = await db.select().from(packages).where(eq(packages.id, packageId)).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ package: row });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminJson();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  // Soft-delete by default so historical orders keep their package reference.
  const archive = new URL(_req.url).searchParams.get("hard") !== "1";
  if (archive) {
    return adminPatch(packages, Number(id), { archived: true, visible: false, updatedAt: new Date() }, "package");
  }
  return adminDelete(packages, Number(id));
}
