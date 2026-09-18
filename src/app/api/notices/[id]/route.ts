import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { notices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/requireAdmin";
import { revalidatePublicContent } from "@/lib/revalidatePublic";
import { PUBLIC_TAGS } from "@/lib/publicContent";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();

  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { ...body };
  delete patch.id;
  const [updated] = await db.update(notices).set(patch).where(eq(notices.id, Number(id))).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidatePublicContent(PUBLIC_TAGS.notices);
  return NextResponse.json({ notice: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();

  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.delete(notices).where(eq(notices.id, Number(id)));
  revalidatePublicContent(PUBLIC_TAGS.notices);
  return NextResponse.json({ ok: true });
}
