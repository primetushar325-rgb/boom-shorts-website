import { sql } from "drizzle-orm";
import { db } from "./index";

/**
 * Runtime, idempotent schema sync.
 *
 * The project deploys straight from GitHub to Vercel, so there is no separate
 * migration step in the pipeline. Every statement below is additive and
 * guarded (`IF NOT EXISTS` / conditional UPDATE), so it is safe to run on the
 * existing production database: no table is dropped, no row is deleted.
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

type Cache = { promise?: Promise<void> };

const globalForSchema = globalThis as typeof globalThis & {
  __mbsSchemaSync?: Cache;
};

async function run(): Promise<void> {
  const failures: string[] = [];

  for (const statement of [...BASE_TABLES, ...SCHEMA_STATEMENTS]) {
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
