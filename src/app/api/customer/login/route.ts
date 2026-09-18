import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { customers } from "@/db/schema";
import { rateLimit, verifyPin } from "@/lib/auth";
import { isValidBdPhone, normalizePhone } from "@/lib/format";
import { buildCustomerCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "We could not read the request. Please try again." },
      { status: 400 },
    );
  }

  const phone = normalizePhone(String(body.phone ?? ""));
  const pin = String(body.pin ?? "").trim();

  // Validation first — a malformed request must not consume the rate budget.
  if (!isValidBdPhone(phone) || !pin) {
    return NextResponse.json(
      { error: "Enter the WhatsApp number and PIN you used while ordering." },
      { status: 400 },
    );
  }

  if (!rateLimit(`customer-login:${ip}:${phone}`, 12, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  await ensureSchema();

  try {
    const rows = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
    const customer = rows[0];

    if (!customer || !customer.pinHash || !(await verifyPin(pin, customer.pinHash))) {
      return NextResponse.json({ error: "Wrong number or PIN." }, { status: 401 });
    }

    const res = NextResponse.json({
      customer: { id: customer.id, name: customer.name, phone: customer.phone },
    });
    const cookie = buildCustomerCookie(customer.phone, customer.id);
    res.cookies.set(cookie.name, cookie.value, cookie);
    return res;
  } catch (error) {
    console.error("[customer-login] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "We could not sign you in right now. Please try again in a minute." },
      { status: 500 },
    );
  }
}
