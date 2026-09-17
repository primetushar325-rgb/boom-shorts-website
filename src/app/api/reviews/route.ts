import { NextRequest, NextResponse } from "next/server";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { testimonials } from "@/db/schema";
import { requireAdminJson } from "@/lib/requireAdmin";
import { getCustomerSession } from "@/lib/session";

/**
 * GET  /api/reviews?all=1 — admin list (includes unapproved)
 * GET  /api/reviews       — public list (approved + visible only)
 * POST /api/reviews       — a signed-in customer submits a review (pending approval)
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdminJson();
  const all = new URL(req.url).searchParams.get("all");

  const rows = await db.select().from(testimonials).orderBy(asc(testimonials.sortOrder), desc(testimonials.id));

  if (admin.ok && all) return NextResponse.json({ reviews: rows });
  return NextResponse.json({ reviews: rows.filter((r) => r.approved && r.visible) });
}

export async function POST(req: NextRequest) {
  const customer = await getCustomerSession();
  const body = await req.json().catch(() => ({}));

  const message = String(body.message ?? "").trim().slice(0, 1000);
  const rating = Math.max(1, Math.min(5, Number(body.rating ?? 5) || 5));
  if (message.length < 5) {
    return NextResponse.json({ error: "Please write a slightly longer review." }, { status: 400 });
  }

  // Signed-in customers post under their own name; guests may too, but every
  // review lands unapproved and needs an admin to publish it.
  const name = customer?.name || String(body.name ?? "Customer").trim().slice(0, 80) || "Customer";

  const [created] = await db
    .insert(testimonials)
    .values({
      name,
      message,
      rating,
      approved: false,
      visible: true,
      customerId: customer?.id ?? null,
      orderId: body.orderId ? Number(body.orderId) || null : null,
    })
    .returning();

  return NextResponse.json(
    { review: created, note: "Thanks! Your review will appear once approved." },
    { status: 201 },
  );
}
