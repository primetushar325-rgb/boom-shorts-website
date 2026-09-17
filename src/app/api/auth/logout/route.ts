import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, revokeAdminSession } from "@/lib/session";

export async function POST() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (token) await revokeAdminSession(token).catch(() => {});

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
