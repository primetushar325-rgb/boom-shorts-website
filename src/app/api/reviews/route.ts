import { NextRequest, NextResponse } from "next/server";
import { desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { reviews } from "@/db/schema";
import { isAdminAuthed } from "@/lib/session";
import { getCustomerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Public list: approved reviews only. Admins can request every status. */
export async function GET(req: NextRequest) {
  await ensureSchema();

  const admin = await isAdminAuthed();
  const status = req.nextUrl.searchParams.get("status");

  if (admin && status) {
    const rows = await db
      .select()
      .from(reviews)
      .where(status === "all" ? undefined : eq(reviews.status, status))
      .orderBy(desc(reviews.createdAt))
      .limit(200);
    return NextResponse.json({ reviews: rows, admin: true });
  }

  const rows = await db
    .select({
      id: reviews.id,
      name: reviews.name,
      packageName: reviews.packageName,
      rating: reviews.rating,
      message: reviews.message,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(eq(reviews.status, "approved"))
    .orderBy(desc(reviews.createdAt))
    .limit(100);

  return NextResponse.json({ reviews: rows, admin });
}

/** Signed-in customers can submit a review; it stays hidden until approved. */
export async function POST(req: NextRequest) {
  await ensureSchema();

  const customer = await getCustomerSession();
  if (!customer) {
    return NextResponse.json({ error: "Please sign in to write a review." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rating = Math.max(1, Math.min(5, Math.floor(Number(body.rating) || 5)));
  const message = String(body.message ?? "").trim().slice(0, 600);
  const packageName = String(body.packageName ?? "").trim().slice(0, 120);

  if (message.length < 10) {
    return NextResponse.json({ error: "Please write at least 10 characters." }, { status: 400 });
  }

  // Anti-spam: at most 3 reviews per customer per day.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reviews)
    .where(sql`${reviews.customerId} = ${customer.id} and ${reviews.createdAt} >= ${since}`)
    .limit(1);

  if ((recent[0]?.count ?? 0) >= 3) {
    return NextResponse.json(
      { error: "You have already submitted reviews today. Please try again tomorrow." },
      { status: 429 },
    );
  }

  const [created] = await db
    .insert(reviews)
    .values({
      customerId: customer.id,
      name: customer.name || "Customer",
      phone: customer.phone,
      packageName,
      rating,
      message,
      status: "pending",
    })
    .returning();

  return NextResponse.json({ review: created }, { status: 201 });
}
