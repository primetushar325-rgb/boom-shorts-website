import { NextResponse } from "next/server";
import { clearCookie } from "@/lib/session";
import { CUSTOMER_COOKIE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const cookie = clearCookie(CUSTOMER_COOKIE);
  res.cookies.set(cookie.name, cookie.value, cookie);
  return res;
}
