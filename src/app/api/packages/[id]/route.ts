import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { packages } from "@/db/schema";
import { normalizePackagePricing, toNumber } from "@/lib/pricing";
import { isAdminAuthed } from "@/lib/session";
import { revalidatePublicContent } from "@/lib/revalidatePublic";
import { PUBLIC_TAGS } from "@/lib/publicContent";

export const dynamic = "force-dynamic";

function toFeatureList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 20);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  return [];
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const { id } = await params;
  const packageId = Number(id);
  if (!Number.isInteger(packageId)) {
    return NextResponse.json({ error: "Invalid package id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const rows = await db.select().from(packages).where(eq(packages.id, packageId)).limit(1);
  const current = rows[0];
  if (!current) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};

  if ("category" in body) patch.category = body.category === "service" ? "service" : "boom";
  if ("name" in body) patch.name = String(body.name || "").slice(0, 120) || current.name;
  if ("description" in body) patch.description = String(body.description || "").slice(0, 500);
  if ("badge" in body) {
    patch.badge = ["popular", "bestseller", "new", "none"].includes(String(body.badge))
      ? String(body.badge)
      : "none";
  }
  if ("bestSeller" in body) patch.bestSeller = body.bestSeller === true;
  else if (patch.badge === "bestseller") patch.bestSeller = true;
  if ("buttonText" in body) patch.buttonText = String(body.buttonText || "Order Now").slice(0, 40);
  if ("icon" in body) patch.icon = String(body.icon || "🎬").slice(0, 8);
  if ("quantityLabel" in body) patch.quantityLabel = String(body.quantityLabel || "").slice(0, 60);
  if ("features" in body) patch.features = toFeatureList(body.features);
  if ("demoVideoUrl" in body) patch.demoVideoUrl = String(body.demoVideoUrl || "").slice(0, 500);
  if ("available" in body) patch.available = body.available !== false;
  if ("visible" in body) patch.visible = body.visible !== false;
  if ("showOnHome" in body) patch.showOnHome = body.showOnHome !== false;
  if ("recentlyAdded" in body) patch.recentlyAdded = body.recentlyAdded === true;
  if ("sortOrder" in body) patch.sortOrder = Number(body.sortOrder ?? 0) || 0;

  // Re-normalize pricing whenever any pricing field is touched (or when the
  // current values are missing), so price + discount always stay consistent.
  const pricingTouched =
    "oldPrice" in body || "newPrice" in body || "discountType" in body || "discountValue" in body;

  if (pricingTouched) {
    const pricing = normalizePackagePricing({
      oldPrice: "oldPrice" in body ? body.oldPrice : current.oldPrice,
      newPrice: "newPrice" in body ? body.newPrice : current.newPrice,
      discountType: "discountType" in body ? body.discountType : current.discountType,
      discountValue:
        "discountValue" in body ? body.discountValue : current.discountValue,
    });
    Object.assign(patch, pricing);
  } else if (toNumber(current.newPrice, 0) <= 0) {
    Object.assign(
      patch,
      normalizePackagePricing({
        oldPrice: current.oldPrice,
        newPrice: current.newPrice,
        discountType: current.discountType,
        discountValue: current.discountValue,
      }),
    );
  }

  const [updated] = await db
    .update(packages)
    .set(patch)
    .where(eq(packages.id, packageId))
    .returning();

  revalidatePublicContent(PUBLIC_TAGS.packages);
  return NextResponse.json({ package: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const { id } = await params;
  const packageId = Number(id);
  if (!Number.isInteger(packageId)) {
    return NextResponse.json({ error: "Invalid package id" }, { status: 400 });
  }

  await db.delete(packages).where(eq(packages.id, packageId));
  revalidatePublicContent(PUBLIC_TAGS.packages);
  return NextResponse.json({ ok: true });
}
