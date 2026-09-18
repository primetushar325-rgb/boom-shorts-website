import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { banners } from "@/db/schema";
import { isAdminAuthed } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const { id } = await params;
  const bannerId = Number(id);
  if (!Number.isInteger(bannerId)) {
    return NextResponse.json({ error: "Invalid banner id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  for (const field of ["title", "description", "imageUrl", "link", "buttonText", "buttonUrl"] as const) {
    if (field in body) patch[field] = String(body[field] || "").slice(0, 500);
  }
  if ("type" in body) patch.type = body.type === "offer" ? "offer" : "banner";
  if ("visible" in body) patch.visible = body.visible !== false;
  if ("sortOrder" in body) patch.sortOrder = Number(body.sortOrder ?? 0) || 0;

  const [updated] = await db
    .update(banners)
    .set(patch)
    .where(eq(banners.id, bannerId))
    .returning();

  if (!updated) return NextResponse.json({ error: "Banner not found" }, { status: 404 });
  return NextResponse.json({ banner: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const { id } = await params;
  const bannerId = Number(id);
  if (!Number.isInteger(bannerId)) {
    return NextResponse.json({ error: "Invalid banner id" }, { status: 400 });
  }

  await db.delete(banners).where(eq(banners.id, bannerId));
  return NextResponse.json({ ok: true });
}
