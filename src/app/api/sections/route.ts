import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { sections } from "@/db/schema";
import { asc } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/requireAdmin";

export async function GET() {
  await ensureSchema();

  const rows = await db.select().from(sections).orderBy(asc(sections.sortOrder), asc(sections.id));
  return NextResponse.json({ sections: rows });
}

export async function POST(req: NextRequest) {
  await ensureSchema();

  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const [created] = await db
    .insert(sections)
    .values({
      title: body.title || "New Section",
      subtitle: body.subtitle || "",
      videoUrl: body.videoUrl || "",
      videoThumbnailUrl: body.videoThumbnailUrl || "",
      items: Array.isArray(body.items) ? body.items : [],
      visible: body.visible ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json({ section: created }, { status: 201 });
}
