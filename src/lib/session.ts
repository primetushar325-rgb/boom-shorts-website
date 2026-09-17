import crypto from "crypto";
import { cookies } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { adminSessions, adminUsers, customerSessions, customers } from "@/db/schema";

/**
 * Session handling.
 *
 * The previous scheme stored the *admin password hash* directly in the cookie,
 * which meant the bearer token and the credential were the same value and
 * could not be revoked short of changing the password.
 *
 * Now: the cookie holds a random opaque token; only its SHA-256 digest is
 * stored server-side, so a database leak does not hand out live sessions, and
 * any session can be revoked by deleting its row.
 */

export { ADMIN_COOKIE, CUSTOMER_COOKIE } from "./constants";
import { ADMIN_COOKIE, CUSTOMER_COOKIE } from "./constants";

const ADMIN_SESSION_DAYS = 14;
const CUSTOMER_SESSION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function newToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** The token itself never reaches the database — only this digest does. */
function digest(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  // Admin app is used over https in production; `secure` is set explicitly by
  // callers that know the request scheme so local dev still works.
};

// ---------------------------------------------------------------------------
// Admin sessions
// ---------------------------------------------------------------------------

export type AdminSessionUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
};

export async function createAdminSession(adminUserId: number): Promise<string> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_DAYS * DAY_MS);
  await db.insert(adminSessions).values({
    id: digest(token),
    adminUserId,
    expiresAt,
  });
  return token;
}

export async function getAdminSession(): Promise<AdminSessionUser | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      mustChangePassword: adminUsers.mustChangePassword,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminUserId, adminUsers.id))
    .where(and(eq(adminSessions.id, digest(token)), gt(adminSessions.expiresAt, new Date())))
    .limit(1);

  const user = rows[0];
  if (!user) return null;
  return user;
}

export async function revokeAdminSession(token: string): Promise<void> {
  if (!token) return;
  await db.delete(adminSessions).where(eq(adminSessions.id, digest(token)));
}

export async function revokeAllAdminSessions(adminUserId: number): Promise<void> {
  await db.delete(adminSessions).where(eq(adminSessions.adminUserId, adminUserId));
}

/** Deletes expired session rows. Cheap; called opportunistically after login. */
export async function pruneExpiredSessions(): Promise<void> {
  const now = new Date();
  await Promise.all([
    db.delete(adminSessions).where(lt(adminSessions.expiresAt, now)),
    db.delete(customerSessions).where(lt(customerSessions.expiresAt, now)),
  ]).catch((err) => {
    console.error("[session] prune failed:", err?.message ?? err);
  });
}

export function adminCookieInit() {
  return { ...cookieOptions, maxAge: ADMIN_SESSION_DAYS * 24 * 60 * 60 };
}

// ---------------------------------------------------------------------------
// Customer sessions
// ---------------------------------------------------------------------------

export type CustomerSessionUser = {
  id: number;
  name: string;
  whatsapp: string;
  email: string | null;
};

export async function createCustomerSession(customerId: number): Promise<string> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_DAYS * DAY_MS);
  await db.insert(customerSessions).values({
    id: digest(token),
    customerId,
    expiresAt,
  });
  return token;
}

export async function getCustomerSession(): Promise<CustomerSessionUser | null> {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      whatsapp: customers.whatsapp,
      email: customers.email,
    })
    .from(customerSessions)
    .innerJoin(customers, eq(customerSessions.customerId, customers.id))
    .where(and(eq(customerSessions.id, digest(token)), gt(customerSessions.expiresAt, new Date())))
    .limit(1);

  return rows[0] ?? null;
}

export async function revokeCustomerSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE)?.value;
  if (!token) return;
  await db.delete(customerSessions).where(eq(customerSessions.id, digest(token)));
}

export function customerCookieInit() {
  return { ...cookieOptions, maxAge: CUSTOMER_SESSION_DAYS * 24 * 60 * 60 };
}
