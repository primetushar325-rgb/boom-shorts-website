import { sql } from "drizzle-orm";
import { db, pool } from "./index";

/**
 * Runtime, idempotent schema sync.
 *
 * The project deploys straight from GitHub to Vercel, so there is no separate
 * migration step in the pipeline. Every statement below is additive and
 * guarded (`IF NOT EXISTS` / conditional UPDATE), so it is safe to run on the
 * existing production database: no table is dropped, no row is deleted.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS A FAST PATH
 * ---------------------------------------------------------------------------
 * The full sync is ~66 statements. Executed one-by-one that is ~66 sequential
 * round-trips to the database on *every* serverless cold start — measured at
 * ~0.35 ms each on localhost, i.e. ~340 ms at 5 ms/query and ~1.4 s at
 * 20 ms/query (Vercel → Supabase pooler). Because every dynamic route awaits
 * `ensureSchema()` first, that latency landed directly on:
 *
 *   • GET  /checkout/[id]        → "Order Now" felt dead on the first tap
 *   • POST /api/orders           → order submit timeouts / generic 500
 *   • POST /api/customer/register→ "Network Problem"
 *
 * So on an already-migrated database we now run ONE probe query against the
 * catalog. Only when the probe reports something missing do we execute the DDL.
 *
 * It runs once per server process (the promise is cached, and also cached on
 * globalThis so dev hot-reloads don't re-run it) and never throws — a failing
 * statement only produces a server-side warning so the site stays online.
 */

// ---------------------------------------------------------------------------
// Base tables (mirror of migrations 0000/0001, but idempotent). On the existing
// production database every one of these is a no-op; on a brand-new database
// they make the app boot without a manual migration step.
// ---------------------------------------------------------------------------
const BASE_TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS "settings" (
     "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
     "site_name" text DEFAULT 'Mihad Boom Shorts' NOT NULL,
     "logo_text" text DEFAULT 'Mihad Boom Shorts' NOT NULL,
     "logo_url" text DEFAULT '/logo.png' NOT NULL,
     "demo_video_url" text DEFAULT '' NOT NULL,
     "boom_video_url" text DEFAULT '' NOT NULL,
     "boom_video_thumbnail_url" text DEFAULT '' NOT NULL,
     "service_video_url" text DEFAULT '' NOT NULL,
     "service_video_thumbnail_url" text DEFAULT '' NOT NULL,
     "hero_badge_text" text DEFAULT 'TRUSTED SELLER • SHORTS CREATOR ⚡ FAST DELIVERY' NOT NULL,
     "hero_title" text DEFAULT 'Premium Boom Shorts & Voice Over Shorts Videos' NOT NULL,
     "hero_subtitle" text DEFAULT 'Order high-quality Boom Shorts, professional voice over videos, and complete YouTube channel management.' NOT NULL,
     "stat_happy_clients" text DEFAULT '10K+' NOT NULL,
     "stat_completed_orders" text DEFAULT '500+' NOT NULL,
     "stat_seo_optimized" text DEFAULT '100%' NOT NULL,
     "whatsapp_number" text DEFAULT '8801609371023' NOT NULL,
     "whatsapp_link" text DEFAULT 'https://wa.me/8801609371023' NOT NULL,
     "messenger_link" text DEFAULT '' NOT NULL,
     "facebook_link" text DEFAULT 'https://www.facebook.com/profile.php?id=61592401763665' NOT NULL,
     "telegram_link" text DEFAULT '' NOT NULL,
     "bkash_number" text DEFAULT '01609371023' NOT NULL,
     "nagad_number" text DEFAULT '' NOT NULL,
     "rocket_number" text DEFAULT '' NOT NULL,
     "qr_code_url" text DEFAULT '' NOT NULL,
     "payment_notice" text DEFAULT '' NOT NULL,
     "youtube_video_url" text DEFAULT '' NOT NULL,
     "youtube_thumbnail_url" text DEFAULT '' NOT NULL,
     "youtube_title" text DEFAULT 'Watch How We Create Viral Boom Shorts' NOT NULL,
     "youtube_description" text DEFAULT '' NOT NULL,
     "free_video_link" text DEFAULT '' NOT NULL,
     "offer_enabled" boolean DEFAULT false NOT NULL,
     "offer_text" text DEFAULT 'Limited Time Offer!' NOT NULL,
     "offer_ends_at" timestamp with time zone,
     "admin_password_hash" text NOT NULL,
     "total_visitors" integer DEFAULT 0 NOT NULL,
     "updated_at" timestamp with time zone DEFAULT now() NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS "packages" (
     "id" serial PRIMARY KEY NOT NULL,
     "category" text DEFAULT 'boom' NOT NULL,
     "name" text NOT NULL,
     "description" text DEFAULT '' NOT NULL,
     "old_price" numeric(10, 2),
     "new_price" numeric(10, 2) NOT NULL,
     "badge" text DEFAULT 'none' NOT NULL,
     "button_text" text DEFAULT 'Order Now' NOT NULL,
     "icon" text DEFAULT '🎬' NOT NULL,
     "visible" boolean DEFAULT true NOT NULL,
     "recently_added" boolean DEFAULT false NOT NULL,
     "sort_order" integer DEFAULT 0 NOT NULL,
     "created_at" timestamp with time zone DEFAULT now() NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS "orders" (
     "id" serial PRIMARY KEY NOT NULL,
     "customer_name" text NOT NULL,
     "whatsapp" text NOT NULL,
     "package_id" integer,
     "package_name" text NOT NULL,
     "price" numeric(10, 2) NOT NULL,
     "coupon_code" text,
     "payment_method" text DEFAULT 'bKash' NOT NULL,
     "transaction_id" text NOT NULL,
     "screenshot_url" text DEFAULT '' NOT NULL,
     "status" text DEFAULT 'pending' NOT NULL,
     "created_at" timestamp with time zone DEFAULT now() NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS "sections" (
     "id" serial PRIMARY KEY NOT NULL,
     "title" text NOT NULL,
     "subtitle" text DEFAULT '' NOT NULL,
     "video_url" text DEFAULT '' NOT NULL,
     "video_thumbnail_url" text DEFAULT '' NOT NULL,
     "items" jsonb DEFAULT '[]'::jsonb NOT NULL,
     "visible" boolean DEFAULT true NOT NULL,
     "sort_order" integer DEFAULT 0 NOT NULL,
     "created_at" timestamp with time zone DEFAULT now() NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS "banners" (
     "id" serial PRIMARY KEY NOT NULL,
     "title" text DEFAULT '' NOT NULL,
     "image_url" text DEFAULT '' NOT NULL,
     "link" text DEFAULT '' NOT NULL,
     "type" text DEFAULT 'banner' NOT NULL,
     "visible" boolean DEFAULT true NOT NULL,
     "sort_order" integer DEFAULT 0 NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS "notices" (
     "id" serial PRIMARY KEY NOT NULL,
     "text" text NOT NULL,
     "visible" boolean DEFAULT true NOT NULL,
     "sort_order" integer DEFAULT 0 NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS "testimonials" (
     "id" serial PRIMARY KEY NOT NULL,
     "name" text NOT NULL,
     "avatar_url" text DEFAULT '' NOT NULL,
     "message" text NOT NULL,
     "rating" integer DEFAULT 5 NOT NULL,
     "visible" boolean DEFAULT true NOT NULL,
     "sort_order" integer DEFAULT 0 NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS "faqs" (
     "id" serial PRIMARY KEY NOT NULL,
     "question" text NOT NULL,
     "answer" text NOT NULL,
     "visible" boolean DEFAULT true NOT NULL,
     "sort_order" integer DEFAULT 0 NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS "gallery" (
     "id" serial PRIMARY KEY NOT NULL,
     "image_url" text NOT NULL,
     "caption" text DEFAULT '' NOT NULL,
     "visible" boolean DEFAULT true NOT NULL,
     "sort_order" integer DEFAULT 0 NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS "proof_slides" (
     "id" serial PRIMARY KEY NOT NULL,
     "image_url" text NOT NULL,
     "caption" text DEFAULT '' NOT NULL,
     "visible" boolean DEFAULT true NOT NULL,
     "sort_order" integer DEFAULT 0 NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS "free_video_cards" (
     "id" serial PRIMARY KEY NOT NULL,
     "title" text NOT NULL,
     "thumbnail_url" text DEFAULT '' NOT NULL,
     "link" text DEFAULT '' NOT NULL,
     "visible" boolean DEFAULT true NOT NULL,
     "sort_order" integer DEFAULT 0 NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS "coupons" (
     "id" serial PRIMARY KEY NOT NULL,
     "code" text NOT NULL,
     "discount_percent" integer DEFAULT 10 NOT NULL,
     "active" boolean DEFAULT true NOT NULL,
     "expires_at" timestamp with time zone,
     "created_at" timestamp with time zone DEFAULT now() NOT NULL,
     CONSTRAINT "coupons_code_unique" UNIQUE("code")
   )`,
];

// ---------------------------------------------------------------------------
// Additive schema changes (new columns / tables used by the app) — no data loss
// ---------------------------------------------------------------------------
const SCHEMA_STATEMENTS: string[] = [
  // ---- customers (customer accounts for order history) ---------------------
  `CREATE TABLE IF NOT EXISTS "customers" (
     "id" serial PRIMARY KEY NOT NULL,
     "name" text DEFAULT '' NOT NULL,
     "phone" text NOT NULL,
     "pin_hash" text DEFAULT '' NOT NULL,
     "created_at" timestamp with time zone DEFAULT now() NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "customers_phone_uidx" ON "customers" ("phone")`,

  // ---- order idempotency (database-level duplicate-submit protection) ------
  // One payment (same WhatsApp number + same transaction ID) can only ever own
  // one order. The key is claimed inside the same transaction as the order
  // INSERT, so two simultaneous checkouts can never both succeed: the loser
  // hits the primary key and the server returns the already-created order.
  // A separate table (rather than a unique index on `orders`) is used so that
  // historical rows are never touched — CREATE UNIQUE INDEX on orders would
  // fail if the old race already produced a duplicate pair.
  `CREATE TABLE IF NOT EXISTS "order_idempotency_keys" (
     "idempotency_key" text PRIMARY KEY NOT NULL,
     "order_id" integer NOT NULL
       CONSTRAINT "order_idempotency_keys_order_id_fkey"
       REFERENCES "orders"("id") ON DELETE CASCADE,
     "created_at" timestamp with time zone DEFAULT now() NOT NULL
   )`,
  // Tables created by an earlier build lack the foreign key above. Without it,
  // deleting an order (admin cleanup, tests) left the key pointing at nothing
  // and that payment could never be submitted again. ADD CONSTRAINT has no
  // IF NOT EXISTS form, hence the catalog guard; claims whose order row is
  // already gone are dropped first, otherwise the FK cannot be attached.
  `DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'order_idempotency_keys_order_id_fkey'
     ) THEN
       DELETE FROM "order_idempotency_keys" k
        WHERE NOT EXISTS (SELECT 1 FROM "orders" o WHERE o."id" = k."order_id");
       ALTER TABLE "order_idempotency_keys"
         ADD CONSTRAINT "order_idempotency_keys_order_id_fkey"
         FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
     END IF;
   END $$`,

  // ---- reviews (customer submitted, admin moderated) -----------------------
  `CREATE TABLE IF NOT EXISTS "reviews" (
     "id" serial PRIMARY KEY NOT NULL,
     "customer_id" integer,
     "name" text NOT NULL,
     "phone" text DEFAULT '' NOT NULL,
     "package_name" text DEFAULT '' NOT NULL,
     "rating" integer DEFAULT 5 NOT NULL,
     "message" text NOT NULL,
     "status" text DEFAULT 'pending' NOT NULL,
     "created_at" timestamp with time zone DEFAULT now() NOT NULL,
     "updated_at" timestamp with time zone DEFAULT now() NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS "reviews_status_idx" ON "reviews" ("status")`,

  // ---- packages: pricing, quantity, features, availability, video ----------
  `ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "discount_type" text DEFAULT 'none' NOT NULL`,
  `ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "discount_value" numeric(10, 2) DEFAULT '0' NOT NULL`,
  `ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "best_seller" boolean DEFAULT false NOT NULL`,
  `ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "quantity_label" text DEFAULT '' NOT NULL`,
  `ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "features" jsonb DEFAULT '[]'::jsonb NOT NULL`,
  `ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "demo_video_url" text DEFAULT '' NOT NULL`,
  `ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "available" boolean DEFAULT true NOT NULL`,
  `ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "show_on_home" boolean DEFAULT true NOT NULL`,

  // ---- orders: order code, quantity breakdown, payment status --------------
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "order_code" text`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_id" integer`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "package_quantity" text DEFAULT '' NOT NULL`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "quantity" integer DEFAULT 1 NOT NULL`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "unit_price" numeric(10, 2)`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "original_price" numeric(10, 2)`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "coupon_discount" numeric(10, 2) DEFAULT '0' NOT NULL`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_number" text DEFAULT '' NOT NULL`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'pending' NOT NULL`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "admin_note" text DEFAULT '' NOT NULL`,
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL`,
  // customer's own note, sent along with the WhatsApp confirmation
  `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_note" text DEFAULT '' NOT NULL`,
  // lookup paths used by the duplicate guard and the admin order list
  `CREATE INDEX IF NOT EXISTS "orders_whatsapp_idx" ON "orders" ("whatsapp")`,
  `CREATE INDEX IF NOT EXISTS "orders_transaction_id_idx" ON "orders" (lower("transaction_id"))`,
  // backfill (only touches rows that are still empty)
  `UPDATE "orders" SET "order_code" = 'BS-' || upper(substr(md5(random()::text || "id"::text), 1, 6)) WHERE "order_code" IS NULL`,
  `UPDATE "orders" SET "unit_price" = "price" WHERE "unit_price" IS NULL`,
  `UPDATE "orders" SET "original_price" = "price" WHERE "original_price" IS NULL`,
  // legacy status names -> new status set (keeps existing history intact)
  `UPDATE "orders" SET "status" = 'payment_verified' WHERE "status" = 'confirmed'`,
  `UPDATE "orders" SET "payment_status" = 'verified' WHERE "status" IN ('payment_verified', 'processing', 'completed') AND "payment_status" = 'pending'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_code_uidx" ON "orders" ("order_code")`,

  // ---- coupons: fixed/percent discounts, limits ---------------------------
  `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "discount_type" text DEFAULT 'percent' NOT NULL`,
  `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "discount_value" numeric(10, 2) DEFAULT '0' NOT NULL`,
  `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "min_order" numeric(10, 2) DEFAULT '0' NOT NULL`,
  `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "usage_limit" integer`,
  `ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "used_count" integer DEFAULT 0 NOT NULL`,
  `UPDATE "coupons" SET "discount_value" = "discount_percent" WHERE "discount_value" = 0 AND "discount_percent" > 0`,

  // ---- banners: description + custom button -------------------------------
  `ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "description" text DEFAULT '' NOT NULL`,
  `ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "button_text" text DEFAULT '' NOT NULL`,
  `ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "button_url" text DEFAULT '' NOT NULL`,

  // ---- settings: featured video description -------------------------------
  `ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "youtube_description" text DEFAULT '' NOT NULL`,

  // ---- Row Level Security -------------------------------------------------
  // The site talks to Postgres with the database owner role through Drizzle
  // (server-side only), which bypasses RLS. Enabling RLS with *no* permissive
  // policies means the public/anon Supabase API keys cannot read or write any
  // of these tables directly — including settings (admin password hash) and
  // customer orders. All customer/admin access goes through authenticated
  // server routes instead.
  `ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "packages" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "banners" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "notices" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "testimonials" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "faqs" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "gallery" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "sections" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "proof_slides" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "free_video_cards" ENABLE ROW LEVEL SECURITY`,
];

const ALL_STATEMENTS = [...BASE_TABLES, ...SCHEMA_STATEMENTS];

// ---------------------------------------------------------------------------
// Fast path: one catalog query that proves the schema is already up to date.
// Keep this list in sync with the statements above — anything the app depends
// on must be probed, otherwise a missing piece would never be created.
// ---------------------------------------------------------------------------
const REQUIRED_COLUMNS: [table: string, column: string][] = [
  ["packages", "discount_type"],
  ["packages", "discount_value"],
  ["packages", "best_seller"],
  ["packages", "quantity_label"],
  ["packages", "features"],
  ["packages", "demo_video_url"],
  ["packages", "available"],
  ["packages", "show_on_home"],
  ["orders", "order_code"],
  ["orders", "customer_id"],
  ["orders", "package_quantity"],
  ["orders", "quantity"],
  ["orders", "unit_price"],
  ["orders", "original_price"],
  ["orders", "discount_amount"],
  ["orders", "coupon_discount"],
  ["orders", "payment_number"],
  ["orders", "payment_status"],
  ["orders", "admin_note"],
  ["orders", "updated_at"],
  ["orders", "customer_note"],
  ["coupons", "discount_type"],
  ["coupons", "discount_value"],
  ["coupons", "min_order"],
  ["coupons", "usage_limit"],
  ["coupons", "used_count"],
  ["banners", "description"],
  ["banners", "button_text"],
  ["banners", "button_url"],
  ["settings", "youtube_description"],
  ["customers", "phone"],
  ["customers", "pin_hash"],
  ["reviews", "status"],
  ["order_idempotency_keys", "idempotency_key"],
  ["order_idempotency_keys", "order_id"],
];

const REQUIRED_INDEXES: string[] = [
  "customers_phone_uidx",
  "orders_order_code_uidx",
  "reviews_status_idx",
  "order_idempotency_keys_pkey",
];

/** Constraints the probe must see; missing ones make the sync batch run once. */
const REQUIRED_CONSTRAINTS: string[] = ["order_idempotency_keys_order_id_fkey"];

/** `true` when the catalog already has everything the app needs (one query). */
async function schemaIsComplete(): Promise<boolean> {
  const columnList = REQUIRED_COLUMNS.map(([table, column]) => `('${table}', '${column}')`).join(
    ", ",
  );
  const indexList = REQUIRED_INDEXES.map((name) => `'${name}'`).join(", ");
  const constraintList = REQUIRED_CONSTRAINTS.map((name) => `'${name}'`).join(", ");

  // Table/column/index/constraint names above are hard-coded literals from this
  // module, never user input, so interpolating them into the probe is safe.
  const result = await db.execute(sql.raw(`
    SELECT (
      (SELECT count(*) FROM information_schema.columns
         WHERE table_schema = 'public'
           AND (table_name, column_name) IN (VALUES ${columnList})) = ${REQUIRED_COLUMNS.length}
      AND
      (SELECT count(*) FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'i'
          AND c.relname IN (${indexList})) = ${REQUIRED_INDEXES.length}
      AND
      (SELECT count(*) FROM pg_constraint
        WHERE conname IN (${constraintList})) = ${REQUIRED_CONSTRAINTS.length}
    ) AS complete
  `));

  // drizzle's node-postgres driver hands back the raw pg QueryResult.
  const rows = (result as unknown as { rows?: { complete?: boolean }[] })?.rows;
  return rows?.[0]?.complete === true;
}

/**
 * Runs every statement in one round-trip using the simple query protocol
 * (no bind parameters ⇒ Postgres accepts a multi-statement string). Returns
 * false when the batch is rejected so the caller can fall back statement by
 * statement, which keeps a single unsupported statement from blocking the rest.
 */
async function runBatched(): Promise<boolean> {
  const script = ALL_STATEMENTS.map((statement) => statement.trim().replace(/;+\s*$/, "")).join(
    ";\n",
  );
  const client = await pool.connect();
  try {
    await client.query(`${script};`);
    return true;
  } catch {
    return false;
  } finally {
    client.release();
  }
}

async function runStatementByStatement(): Promise<void> {
  const failures: string[] = [];

  for (const statement of ALL_STATEMENTS) {
    try {
      await db.execute(sql.raw(statement));
    } catch (error) {
      // Never leak SQL values/credentials — only the statement head + message.
      const message = error instanceof Error ? error.message : "unknown error";
      failures.push(`${statement.slice(0, 60)}… → ${message}`);
    }
  }

  if (failures.length > 0) {
    console.warn(
      `[schema-sync] ${failures.length} statement(s) skipped (this is normal on a local Postgres without Supabase extensions):\n- ${failures.join("\n- ")}`,
    );
  }
}

async function run(): Promise<void> {
  try {
    if (await schemaIsComplete()) return;
  } catch (error) {
    // A catalog probe failure must not stop the sync; fall through to the DDL.
    console.warn(
      "[schema-sync] probe failed, running the full sync:",
      error instanceof Error ? error.message : error,
    );
  }

  if (!(await runBatched().catch(() => false))) {
    await runStatementByStatement();
  }
}

type Cache = { promise?: Promise<void> };

const globalForSchema = globalThis as typeof globalThis & {
  __mbsSchemaSync?: Cache;
};

export function ensureSchema(): Promise<void> {
  const cache = (globalForSchema.__mbsSchemaSync ??= {});
  if (!cache.promise) {
    cache.promise = run().catch((error) => {
      console.error("[schema-sync] unexpected failure", error);
      cache.promise = undefined;
    });
  }
  return cache.promise;
}
