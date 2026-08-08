import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { banners } from "@/db/schema";
import { asc } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/requireAdmin";

export async function GET() {
  const rows = await db.select().from(banners).orderBy(asc(banners.sortOrder), asc(banners.id));
  return NextResponse.json({ banners: rows });
}

export async function POST(req: NextRequest) {
  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const [created] = await db
    .insert(banners)
    .values({
      title: body.title || "",
      imageUrl: body.imageUrl || "",
      link: body.link || "",
      type: body.type === "offer" ? "offer" : "banner",
      visible: body.visible ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json({ banner: created }, { status: 201 });
}
