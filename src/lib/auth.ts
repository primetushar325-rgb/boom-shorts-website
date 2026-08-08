import crypto from "crypto";

export { ADMIN_COOKIE } from "./constants";

const SALT = "mihad-boom-shorts-secure-salt-v1";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(`${password}::${SALT}`).digest("hex");
}

export function isValidSession(cookieValue: string | undefined, currentHash: string): boolean {
  if (!cookieValue) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(cookieValue), Buffer.from(currentHash));
  } catch {
    return false;
  }
}
