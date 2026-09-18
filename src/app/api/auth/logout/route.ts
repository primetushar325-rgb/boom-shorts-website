import { NextResponse } from "next/server";
import { clearCookie } from "@/lib/session";
import { ADMIN_COOKIE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const cookie = clearCookie(ADMIN_COOKIE);
  res.cookies.set(cookie.name, cookie.value, cookie);
  return res;
}
