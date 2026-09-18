import crypto from "crypto";
import { ADMIN_COOKIE, CUSTOMER_COOKIE } from "./constants";

export { ADMIN_COOKIE, CUSTOMER_COOKIE };

const SALT = "mihad-boom-shorts-secure-salt-v1";

/** Legacy admin password hash (kept for backward compatibility with stored data). */
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(`${password}::${SALT}`).digest("hex");
}

/** Short, non-reversible fingerprint used inside session tokens. */
export function fingerprint(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Session tokens — HMAC signed, expiring, stateless
// ---------------------------------------------------------------------------
export type SessionKind = "admin" | "customer";

export type SessionPayload = {
  k: SessionKind;
  id: number;
  fp: string;
  exp: number;
};

function sessionSecret(): string {
  const explicit = process.env.SESSION_SECRET?.trim();
  if (explicit) return explicit;
  // Fallback: derive from DATABASE_URL — a server-only secret the app already
  // requires. It is never sent to the browser and needs no extra env var.
  return crypto
    .createHash("sha256")
    .update(`${process.env.DATABASE_URL ?? "boom-shorts"}|mbs-session-v1`)
    .digest("hex");
}

function sign(data: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(data).digest("base64url");
}

export function createSessionToken(
  payload: Omit<SessionPayload, "exp"> & { ttlSeconds: number },
): string {
  const body: SessionPayload = {
    k: payload.k,
    id: payload.id,
    fp: payload.fp,
    exp: Date.now() + payload.ttlSeconds * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!payload || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (payload.k !== "admin" && payload.k !== "customer") return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Customer PINs — scrypt hashes, never stored in plain text
//
// scrypt is deliberately expensive (tens of milliseconds). The async variants
// are used everywhere so hashing a PIN never blocks the Node event loop — on a
// serverless function that block would stall every other in-flight request,
// which is exactly how a "simple" order submit turned into a timeout.
// ---------------------------------------------------------------------------
function scrypt(value: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(value, salt, 32, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey as Buffer);
    });
  });
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = (await scrypt(pin, salt)).toString("hex");
  return `s1$${salt}$${hash}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (!stored || !pin) return false;
  const [version, salt, hash] = stored.split("$");
  if (version !== "s1" || !salt || !hash) return false;
  const candidate = await scrypt(pin, salt);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

// ---------------------------------------------------------------------------
// Very small in-memory rate limiter (per server instance)
// ---------------------------------------------------------------------------
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
