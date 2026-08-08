import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { gallery } from "@/db/schema";
import { asc } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/requireAdmin";

export async function GET() {
  const rows = await db.select().from(gallery).orderBy(asc(gallery.sortOrder), asc(gallery.id));
  return NextResponse.json({ gallery: rows });
}

export async function POST(req: NextRequest) {
  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.imageUrl) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });

  const [created] = await db
    .insert(gallery)
    .values({
      imageUrl: body.imageUrl,
      caption: body.caption || "",
      visible: body.visible ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json({ item: created }, { status: 201 });
}
