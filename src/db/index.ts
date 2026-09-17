import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Test seam: when `BOOM_DB_INSTANCE` is present on globalThis it is used as the
 * Drizzle instance instead of the Postgres pool. The test suite uses this to
 * run the *real* query builders (order creation, coupon validation, admin
 * patches) against an in-process PGlite database, so tests exercise shipped
 * code rather than a re-implementation of it.
 */

/**
 * Database entry point.
 *
 * The pool is created lazily. This matters for two reasons:
 *
 *  1. `next build` imports every route module to collect page data. If the pool
 *     were created eagerly — or if constructing the Drizzle instance touched a
 *     missing connection string — the build would fail on any machine without
 *     live credentials, even though every page is `force-dynamic` and never
 *     queries during the build.
 *  2. Drizzle reads properties off the pool while constructing, so a Proxy that
 *     throws on *any* access still breaks the build. Instead, when
 *     DATABASE_URL is absent we hand Drizzle a stub whose query methods reject
 *     with a clear message. Construction succeeds; the first real query fails
 *     loudly rather than silently.
 */

const MISSING_URL_ERROR =
  "DATABASE_URL is required. Set it to your Supabase connection string " +
  "(see .env.example) before the app queries the database.";

const globalForDb = globalThis as typeof globalThis & {
  __boomShortsPool?: Pool;
};

let cachedPool: Pool | undefined = globalForDb.__boomShortsPool;
let warned = false;

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    if (!warned) {
      warned = true;
      console.warn(`[db] ${MISSING_URL_ERROR}`);
    }
    // Structurally a Pool, but every query rejects. Never connects anywhere.
    const stub = {
      query: () => Promise.reject(new Error(MISSING_URL_ERROR)),
      connect: () => Promise.reject(new Error(MISSING_URL_ERROR)),
      end: () => Promise.resolve(),
      on: () => stub,
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
      options: {},
    } as unknown as Pool;
    return stub;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    // Supabase's pooler presents a valid cert chain in production; the flag is
    // off by default and can be forced on with DATABASE_SSL=require.
    ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : { rejectUnauthorized: false },
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  });

  pool.on("error", (err) => {
    // A background idle-client error must not take the server process down.
    console.error("[db] idle client error:", err.message);
  });

  return pool;
}

function getPool(): Pool {
  if (cachedPool) return cachedPool;
  cachedPool = createPool();
  if (process.env.NODE_ENV !== "production" && process.env.DATABASE_URL) {
    globalForDb.__boomShortsPool = cachedPool;
  }
  return cachedPool;
}

/** Forwards property access to the real pool, creating it on first touch. */
const lazyPool = new Proxy({} as Pool, {
  get(_target, prop) {
    const real = getPool();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
  has(_target, prop) {
    return prop in getPool();
  },
});

export const pool = lazyPool;

const injected = (globalThis as { __boomShortsTestDb?: NodePgDatabase<typeof schema> })
  .__boomShortsTestDb;

export const db: NodePgDatabase<typeof schema> = injected ?? drizzle(lazyPool, { schema });

export { schema };
