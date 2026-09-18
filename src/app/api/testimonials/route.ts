import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { testimonials } from "@/db/schema";
import { asc } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/requireAdmin";

export async function GET() {
  await ensureSchema();

  const rows = await db
    .select()
    .from(testimonials)
    .orderBy(asc(testimonials.sortOrder), asc(testimonials.id));
  return NextResponse.json({ testimonials: rows });
}

export async function POST(req: NextRequest) {
  await ensureSchema();

  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const [created] = await db
    .insert(testimonials)
    .values({
      name: body.name || "Customer",
      avatarUrl: body.avatarUrl || "",
      message: body.message || "",
      rating: body.rating ?? 5,
      visible: body.visible ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json({ testimonial: created }, { status: 201 });
}
