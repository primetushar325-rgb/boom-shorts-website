import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { customers } from "@/db/schema";
import { hashPin, isValidPin, rateLimit } from "@/lib/auth";
import { isValidBdPhone, normalizePhone } from "@/lib/format";
import { buildCustomerCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await ensureSchema();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!rateLimit(`customer-register:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim().slice(0, 80);
  const phone = normalizePhone(String(body.phone ?? ""));
  const pin = String(body.pin ?? "").trim();

  if (!name) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!isValidBdPhone(phone)) {
    return NextResponse.json({ error: "Please enter a valid WhatsApp number." }, { status: 400 });
  }
  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "PIN must be 4–6 digits." }, { status: 400 });
  }

  const existing = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);

  if (existing[0]) {
    // An account already exists for this number — treat it as a sign-in and
    // never silently overwrite an existing PIN.
    if (existing[0].pinHash) {
      return NextResponse.json(
        { error: "This number already has an account. Please sign in instead." },
        { status: 409 },
      );
    }
    const [updated] = await db
      .update(customers)
      .set({ name, pinHash: hashPin(pin) })
      .where(eq(customers.id, existing[0].id))
      .returning();

    const res = NextResponse.json({
      customer: { id: updated.id, name: updated.name, phone: updated.phone },
    });
    const cookie = buildCustomerCookie(updated.phone, updated.id);
    res.cookies.set(cookie.name, cookie.value, cookie);
    return res;
  }

  const [created] = await db
    .insert(customers)
    .values({ name, phone, pinHash: hashPin(pin) })
    .returning();

  const res = NextResponse.json(
    { customer: { id: created.id, name: created.name, phone: created.phone } },
    { status: 201 },
  );
  const cookie = buildCustomerCookie(created.phone, created.id);
  res.cookies.set(cookie.name, cookie.value, cookie);
  return res;
}
