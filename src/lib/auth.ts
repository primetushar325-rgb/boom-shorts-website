/**
 * Compatibility shim.
 *
 * The real implementations moved:
 *   hashing          -> ./password   (scrypt, per-password salt)
 *   sessions         -> ./session    (opaque token, server-side revocable)
 *   admin authz      -> ./requireAdmin
 *
 * Kept so any lingering import path still resolves instead of breaking the
 * build. New code should import from the modules above directly.
 */

export { hashPassword, verifyPassword, safeEqual, needsRehash } from "./password";
export { ADMIN_COOKIE, CUSTOMER_COOKIE } from "./session";
