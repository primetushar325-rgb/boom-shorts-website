import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { packages } from "@/db/schema";
import { normalizePackagePricing } from "@/lib/pricing";
import { isAdminAuthed } from "@/lib/session";
import { revalidatePublicContent } from "@/lib/revalidatePublic";
import { PUBLIC_TAGS } from "@/lib/publicContent";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSchema();
  const rows = await db.select().from(packages).orderBy(asc(packages.sortOrder), asc(packages.id));
  return NextResponse.json({ packages: rows });
}

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

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Pricing is always normalized so original price, discount and final price
  // can never contradict each other.
  const pricing = normalizePackagePricing({
    oldPrice: body.oldPrice,
    newPrice: body.newPrice,
    discountType: body.discountType,
    discountValue: body.discountValue,
  });

  const [created] = await db
    .insert(packages)
    .values({
      category: body.category === "service" ? "service" : "boom",
      name: String(body.name || "New Package").slice(0, 120),
      description: String(body.description || "").slice(0, 500),
      ...pricing,
      badge: ["popular", "bestseller", "new", "none"].includes(String(body.badge))
        ? String(body.badge)
        : "none",
      bestSeller: body.bestSeller === true || body.badge === "bestseller",
      buttonText: String(body.buttonText || "Order Now").slice(0, 40),
      icon: String(body.icon || "🎬").slice(0, 8),
      quantityLabel: String(body.quantityLabel || "").slice(0, 60),
      features: toFeatureList(body.features),
      demoVideoUrl: String(body.demoVideoUrl || "").slice(0, 500),
      available: body.available !== false,
      visible: body.visible !== false,
      showOnHome: body.showOnHome !== false,
      recentlyAdded: body.recentlyAdded === true,
      sortOrder: Number(body.sortOrder ?? 0) || 0,
    })
    .returning();

  revalidatePublicContent(PUBLIC_TAGS.packages);
  return NextResponse.json({ package: created }, { status: 201 });
}
