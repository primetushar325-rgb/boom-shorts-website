import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { notices } from "@/db/schema";
import { asc } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/requireAdmin";

export async function GET() {
  await ensureSchema();

  const rows = await db.select().from(notices).orderBy(asc(notices.sortOrder), asc(notices.id));
  return NextResponse.json({ notices: rows });
}

export async function POST(req: NextRequest) {
  await ensureSchema();

  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const [created] = await db
    .insert(notices)
    .values({
      text: body.text || "",
      visible: body.visible ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json({ notice: created }, { status: 201 });
}
