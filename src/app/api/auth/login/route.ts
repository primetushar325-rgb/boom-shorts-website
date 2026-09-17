import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, createAdminSession, pruneExpiredSessions } from "@/lib/session";
import { adminCookieInit } from "@/lib/session";
import { checkAdminCredentials, needsAdminSetup } from "@/lib/adminBootstrap";

/**
 * POST /api/auth/login
 *
 * The cookie now holds an opaque random session token (only its SHA-256 digest
 * is stored), replacing the old scheme that put the password hash itself in the
 * cookie. Failed attempts are throttled per IP.
 */

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60 * 1000;

function throttleKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function POST(req: NextRequest) {
  const key = throttleKey(req);
  const now = Date.now();
  const record = attempts.get(key);

  if (record && record.resetAt > now && record.count >= MAX_ATTEMPTS) {
    const waitMin = Math.ceil((record.resetAt - now) / 60000);
    return NextResponse.json(
      { error: `Too many attempts. Please try again in ${waitMin} minute(s).` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  const result = await checkAdminCredentials(email, password);

  if (!result.ok) {
    const prev = attempts.get(key);
    if (!prev || prev.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    } else {
      prev.count += 1;
    }
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  attempts.delete(key);

  const token = await createAdminSession(result.adminId);
  pruneExpiredSessions().catch(() => {});

  const res = NextResponse.json({
    ok: true,
    email: result.email,
    name: result.name,
    mustChangePassword: result.mustChangePassword,
  });
  res.cookies.set(ADMIN_COOKIE, token, adminCookieInit());
  return res;
}

/** GET — lets the login page know whether first-run setup is required. */
export async function GET() {
  const setup = await needsAdminSetup().catch(() => false);
  return NextResponse.json({ needsSetup: setup });
}
