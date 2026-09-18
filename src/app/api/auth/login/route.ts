import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { hashPassword, rateLimit } from "@/lib/auth";
import { buildAdminCookie } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { ensureSchema } from "@/db/ensureSchema";

export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  await ensureSchema();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!rateLimit(`admin-login:${ip}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes." },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const password = typeof body.password === "string" ? body.password : "";

  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const settings = await getSettings();
  const attemptHash = hashPassword(password);

  if (!safeEqual(attemptHash, settings.adminPasswordHash)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  const cookie = buildAdminCookie(settings.adminPasswordHash);
  res.cookies.set(cookie.name, cookie.value, cookie);
  return res;
}
