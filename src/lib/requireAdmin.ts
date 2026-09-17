import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "./constants";
import { getAdminSession, type AdminSessionUser } from "./session";

/**
 * Admin authorisation.
 *
 * Every mutating admin route calls `requireAdminJson()` (API routes) and the
 * admin layout calls `requireAdminUser()` (server components). Security never
 * depends on the UI hiding a button.
 */

export async function requireAdminUser(): Promise<AdminSessionUser | null> {
  return getAdminSession();
}

/** Back-compat boolean helper used by the middleware and legacy call sites. */
export async function isAdminAuthed(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

export type AdminGuard =
  | { ok: true; admin: AdminSessionUser }
  | { ok: false; response: NextResponse };

export async function requireAdminJson(): Promise<AdminGuard> {
  const admin = await getAdminSession();
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, admin };
}

/**
 * Cheap middleware-safe check: does an admin session cookie exist at all?
 * The middleware runs on the edge and must not touch the database, so it only
 * tests presence; the real lookup happens in the layout and route handlers.
 */
export async function hasAdminCookie(): Promise<boolean> {
  const store = await cookies();
  return Boolean(store.get(ADMIN_COOKIE)?.value);
}
