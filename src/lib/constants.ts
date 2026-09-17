/**
 * Cookie names.
 *
 * This module must stay dependency-free: `src/middleware.ts` runs on the Edge
 * runtime and imports it, and pulling in `@/db` there would drag the native
 * `pg` driver into the Edge bundle and fail the build.
 */
export const ADMIN_COOKIE = "boom_admin_session";
export const CUSTOMER_COOKIE = "boom_customer_session";
