import crypto from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { ADMIN_COOKIE, CUSTOMER_COOKIE } from "./constants";
import { createSessionToken, fingerprint, verifySessionToken } from "./auth";
import { getSettings } from "./settings";

export const ADMIN_SESSION_TTL = 60 * 60 * 24 * 14; // 14 days
export const CUSTOMER_SESSION_TTL = 60 * 60 * 24 * 60; // 60 days

const isProd = process.env.NODE_ENV === "production";

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  const payload = verifySessionToken(store.get(ADMIN_COOKIE)?.value);
  if (!payload || payload.k !== "admin") return false;

  const settings = await getSettings();
  return payload.fp === fingerprint(settings.adminPasswordHash);
}

export function buildAdminCookie(adminPasswordHash: string) {
  return {
    name: ADMIN_COOKIE,
    value: createSessionToken({
      k: "admin",
      id: 1,
      fp: fingerprint(adminPasswordHash),
      ttlSeconds: ADMIN_SESSION_TTL,
    }),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: ADMIN_SESSION_TTL,
  };
}

// ---------------------------------------------------------------------------
// Customer (phone + PIN account, used for order history and reviews)
// ---------------------------------------------------------------------------
export type CustomerSession = { id: number; name: string; phone: string };

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const store = await cookies();
  const payload = verifySessionToken(store.get(CUSTOMER_COOKIE)?.value);
  if (!payload || payload.k !== "customer") return null;

  const rows = await db
    .select({ id: customers.id, name: customers.name, phone: customers.phone })
    .from(customers)
    .where(eq(customers.id, payload.id))
    .limit(1);

  const customer = rows[0];
  if (!customer) return null;
  if (payload.fp !== fingerprint(customer.phone)) return null;
  return customer;
}

export function buildCustomerCookie(phone: string, id: number) {
  return {
    name: CUSTOMER_COOKIE,
    value: createSessionToken({
      k: "customer",
      id,
      fp: fingerprint(phone),
      ttlSeconds: CUSTOMER_SESSION_TTL,
    }),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: CUSTOMER_SESSION_TTL,
  };
}

export function clearCookie(name: string) {
  return {
    name,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: 0,
  };
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------
export function randomId(bytes = 8): string {
  return crypto.randomBytes(bytes).toString("hex");
}
