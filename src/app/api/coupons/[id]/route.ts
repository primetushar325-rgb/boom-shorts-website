import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/requireAdmin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { ...body };
  delete patch.id;
  if (patch.code) patch.code = String(patch.code).toUpperCase().trim();
  if ("expiresAt" in patch) patch.expiresAt = patch.expiresAt ? new Date(patch.expiresAt as string) : null;
  const [updated] = await db.update(coupons).set(patch).where(eq(coupons.id, Number(id))).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ coupon: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.delete(coupons).where(eq(coupons.id, Number(id)));
  return NextResponse.json({ ok: true });
}
