import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { desc } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/requireAdmin";

export async function GET() {
  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(coupons).orderBy(desc(coupons.id));
  return NextResponse.json({ coupons: rows });
}

export async function POST(req: NextRequest) {
  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const [created] = await db
    .insert(coupons)
    .values({
      code: String(body.code).toUpperCase().trim(),
      discountPercent: Number(body.discountPercent ?? 10),
      active: body.active ?? true,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })
    .returning();

  return NextResponse.json({ coupon: created }, { status: 201 });
}
