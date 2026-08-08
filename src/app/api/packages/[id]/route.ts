import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { packages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/requireAdmin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { ...body };
  delete patch.id;
  if ("oldPrice" in patch) patch.oldPrice = patch.oldPrice ? String(patch.oldPrice) : null;
  if ("newPrice" in patch) patch.newPrice = String(patch.newPrice);

  const [updated] = await db
    .update(packages)
    .set(patch)
    .where(eq(packages.id, Number(id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ package: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(packages).where(eq(packages.id, Number(id)));
  return NextResponse.json({ ok: true });
}
