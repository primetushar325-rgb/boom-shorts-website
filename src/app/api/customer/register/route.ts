import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { customers } from "@/db/schema";
import { hashPin, isValidPin, rateLimit } from "@/lib/auth";
import { isValidBdPhone, normalizePhone } from "@/lib/format";
import { buildCustomerCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_NAME = 80;

/**
 * Creates a customer account (WhatsApp number + PIN) and signs them in.
 *
 * Everything the browser needs to distinguish "you typed something wrong" from
 * "our server failed" is returned as JSON with a real status code, so the UI
 * never has to fall back to a generic "Network Problem" for a validation or
 * database rejection.
 */
export async function POST(req: NextRequest) {
  const errorId = Math.random().toString(36).slice(2, 10);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "We could not read the request. Please try again." },
      { status: 400 },
    );
  }

  const name = String(body.name ?? "").trim().slice(0, MAX_NAME);
  const phone = normalizePhone(String(body.phone ?? ""));
  const pin = String(body.pin ?? "").trim();

  // ---- validation first: a bad request must not consume the rate budget ----
  if (!name) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!isValidBdPhone(phone)) {
    return NextResponse.json(
      { error: "Please enter a valid WhatsApp number (01XXXXXXXXX)." },
      { status: 400 },
    );
  }
  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "PIN must be 4–6 digits." }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!rateLimit(`customer-register:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  await ensureSchema();

  const pinHash = await hashPin(pin);

  try {
    const existing = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, phone))
      .limit(1);

    if (existing[0]) {
      // An account already exists for this number — treat it as a sign-in and
      // never silently overwrite an existing PIN.
      if (existing[0].pinHash) {
        return NextResponse.json(
          {
            error: "This number already has an account. Please sign in with your PIN instead.",
            exists: true,
          },
          { status: 409 },
        );
      }

      const [updated] = await db
        .update(customers)
        .set({ name, pinHash })
        .where(eq(customers.id, existing[0].id))
        .returning();

      if (!updated) {
        return NextResponse.json(
          { error: "Could not finish creating your account. Please try again." },
          { status: 500 },
        );
      }

      const res = NextResponse.json({
        customer: { id: updated.id, name: updated.name, phone: updated.phone },
      });
      const cookie = buildCustomerCookie(updated.phone, updated.id);
      res.cookies.set(cookie.name, cookie.value, cookie);
      return res;
    }

    // Conflict-safe insert: two simultaneous registrations for the same number
    // used to crash the request on the unique index.
    const inserted = await db
      .insert(customers)
      .values({ name, phone, pinHash })
      .onConflictDoNothing({ target: customers.phone })
      .returning({ id: customers.id, name: customers.name, phone: customers.phone });

    let created = inserted[0];
    if (!created) {
      const retry = await db
        .select({ id: customers.id, name: customers.name, phone: customers.phone, pinHash: customers.pinHash })
        .from(customers)
        .where(eq(customers.phone, phone))
        .limit(1);
      const row = retry[0];
      if (!row) {
        return NextResponse.json(
          { error: "Could not create your account. Please try again." },
          { status: 500 },
        );
      }
      // Somebody else created it a moment ago. If it has no PIN yet, claim it.
      if (!row.pinHash) {
        await db
          .update(customers)
          .set({ name, pinHash })
          .where(eq(customers.id, row.id));
      } else {
        return NextResponse.json(
          {
            error: "This number already has an account. Please sign in with your PIN instead.",
            exists: true,
          },
          { status: 409 },
        );
      }
      created = { id: row.id, name: row.name, phone: row.phone };
    }

    const res = NextResponse.json(
      { customer: { id: created.id, name: created.name, phone: created.phone } },
      { status: 201 },
    );
    const cookie = buildCustomerCookie(created.phone, created.id);
    res.cookies.set(cookie.name, cookie.value, cookie);
    return res;
  } catch (error) {
    // A database problem is a server error, never a "network problem" for the
    // customer. Full detail stays in the server log.
    console.error(`[customer-register ${errorId}] failed:`, error);
    return NextResponse.json(
      {
        error:
          "We could not create your account right now. Please try again in a minute — your orders are unaffected.",
        errorId,
      },
      { status: 500 },
    );
  }
}
