import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { packages } from "@/db/schema";
import { asc } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/requireAdmin";

export async function GET() {
  const rows = await db.select().from(packages).orderBy(asc(packages.sortOrder), asc(packages.id));
  return NextResponse.json({ packages: rows });
}

export async function POST(req: NextRequest) {
  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const [created] = await db
    .insert(packages)
    .values({
      category: body.category === "service" ? "service" : "boom",
      name: body.name || "New Package",
      description: body.description || "",
      oldPrice: body.oldPrice ? String(body.oldPrice) : null,
      newPrice: String(body.newPrice ?? 0),
      badge: body.badge || "none",
      buttonText: body.buttonText || "Order Now",
      icon: body.icon || "🎬",
      visible: body.visible ?? true,
      recentlyAdded: body.recentlyAdded ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json({ package: created }, { status: 201 });
}
