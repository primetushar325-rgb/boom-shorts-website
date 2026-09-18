import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { proofSlides } from "@/db/schema";
import { asc } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/requireAdmin";
import { revalidatePublicContent } from "@/lib/revalidatePublic";
import { PUBLIC_TAGS } from "@/lib/publicContent";

export async function GET() {
  await ensureSchema();

  const rows = await db.select().from(proofSlides).orderBy(asc(proofSlides.sortOrder), asc(proofSlides.id));
  return NextResponse.json({ proofSlides: rows });
}

export async function POST(req: NextRequest) {
  await ensureSchema();

  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.imageUrl) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });

  const [created] = await db
    .insert(proofSlides)
    .values({
      imageUrl: body.imageUrl,
      caption: body.caption || "",
      visible: body.visible ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  revalidatePublicContent(PUBLIC_TAGS.proofSlides);
  return NextResponse.json({ item: created }, { status: 201 });
}
