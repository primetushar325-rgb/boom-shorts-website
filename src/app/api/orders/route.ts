import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/requireAdmin";

export async function GET() {
  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  return NextResponse.json({ orders: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const customerName = String(body.customerName || "").trim();
  const whatsapp = String(body.whatsapp || "").trim();
  const packageName = String(body.packageName || "").trim();
  const transactionId = String(body.transactionId || "").trim();
  const price = Number(body.price || 0);

  if (!customerName || !whatsapp || !packageName || !transactionId || !price) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [created] = await db
    .insert(orders)
    .values({
      customerName,
      whatsapp,
      packageId: body.packageId ? Number(body.packageId) : null,
      packageName,
      price: String(price),
      couponCode: body.couponCode || null,
      paymentMethod: body.paymentMethod || "bKash",
      transactionId,
      screenshotUrl: body.screenshotUrl || "",
      status: "pending",
    })
    .returning();

  return NextResponse.json({ order: created }, { status: 201 });
}
