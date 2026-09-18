import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { reviews } from "@/db/schema";
import { REVIEW_STATUSES } from "@/lib/constants";
import { isAdminAuthed } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const { id } = await params;
  const reviewId = Number(id);
  if (!Number.isInteger(reviewId)) {
    return NextResponse.json({ error: "Invalid review id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const status = String(body.status ?? "");

  if (!REVIEW_STATUSES.includes(status as (typeof REVIEW_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const [updated] = await db
    .update(reviews)
    .set({ status, updatedAt: new Date() })
    .where(eq(reviews.id, reviewId))
    .returning();

  if (!updated) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  return NextResponse.json({ review: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const { id } = await params;
  const reviewId = Number(id);
  if (!Number.isInteger(reviewId)) {
    return NextResponse.json({ error: "Invalid review id" }, { status: 400 });
  }

  await db.delete(reviews).where(eq(reviews.id, reviewId));
  return NextResponse.json({ ok: true });
}
