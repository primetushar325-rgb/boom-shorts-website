import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, hashPassword } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  const s = await getSettings();
  const attemptHash = hashPassword(password);

  if (attemptHash !== s.adminPasswordHash) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, s.adminPasswordHash, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
