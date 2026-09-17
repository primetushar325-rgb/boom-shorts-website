import { NextRequest, NextResponse } from "next/server";
import { createAdminUser, needsAdminSetup } from "@/lib/adminBootstrap";
import { ADMIN_COOKIE, adminCookieInit, createAdminSession } from "@/lib/session";

/**
 * POST /api/auth/setup — one-time creation of the first admin account.
 *
 * Guarded by the admin table being empty, so it cannot be used to add accounts
 * to an existing installation. Once one admin exists this route 403s forever.
 */
export async function POST(req: NextRequest) {
  const setupNeeded = await needsAdminSetup();
  if (!setupNeeded) {
    return NextResponse.json(
      { error: "Admin accounts already exist. Please sign in instead." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";

  const created = await createAdminUser({ email, password, name: "Administrator" });
  if (!created.ok) return NextResponse.json({ error: created.error }, { status: 400 });

  const token = await createAdminSession(created.id);
  const res = NextResponse.json({ ok: true, email });
  res.cookies.set(ADMIN_COOKIE, token, adminCookieInit());
  return res;
}
