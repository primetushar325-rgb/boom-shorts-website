import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { banners } from "@/db/schema";
import { isAdminAuthed } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSchema();
  const rows = await db.select().from(banners).orderBy(asc(banners.sortOrder), asc(banners.id));
  return NextResponse.json({ banners: rows });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const [created] = await db
    .insert(banners)
    .values({
      title: String(body.title || "").slice(0, 120),
      description: String(body.description || "").slice(0, 300),
      imageUrl: String(body.imageUrl || "").slice(0, 500),
      link: String(body.link || "").slice(0, 500),
      buttonText: String(body.buttonText || "").slice(0, 40),
      buttonUrl: String(body.buttonUrl || "").slice(0, 500),
      type: body.type === "offer" ? "offer" : "banner",
      visible: body.visible !== false,
      sortOrder: Number(body.sortOrder ?? 0) || 0,
    })
    .returning();

  return NextResponse.json({ banner: created }, { status: 201 });
}
