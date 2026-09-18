import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// Hosted Postgres (Supabase) requires TLS; a local development Postgres does
// not. Detect it from the URL so the same code works in both places.
const isLocalDatabase = /(^|@|\/\/)(localhost|127\.0\.0\.1|::1|0\.0\.0\.0)(:|\/|$)/.test(
  databaseUrl,
);

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 10,
    ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
