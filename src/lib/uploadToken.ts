import crypto from "crypto";

/**
 * Short-lived, signed upload permission.
 *
 * The payment-screenshot upload has to be reachable by anonymous customers
 * mid-checkout, but leaving `/api/upload` wide open lets anyone fill the
 * storage bucket. So the checkout server component mints a signed token that
 * the upload route verifies — anonymous, but not unauthenticated.
 *
 * Set UPLOAD_TOKEN_SECRET in production. Without it we derive a per-boot
 * secret, which still works but invalidates on redeploy/restart.
 */

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes — enough to finish a checkout

let bootSecret: string | null = null;

function secret(): string {
  const configured = process.env.UPLOAD_TOKEN_SECRET;
  if (configured) return configured;
  if (!bootSecret) bootSecret = crypto.randomBytes(32).toString("hex");
  return bootSecret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createUploadToken(): string {
  const expires = Date.now() + TOKEN_TTL_MS;
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = `${expires}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyUploadToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expiresStr, nonce, signature] = parts;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  if (!nonce) return false;

  const expected = sign(`${expiresStr}.${nonce}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
