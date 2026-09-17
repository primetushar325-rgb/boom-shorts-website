-- ===========================================================================
-- BOOM SHORTS -- database upgrade (SAFE, re-runnable)
-- ---------------------------------------------------------------------------
-- Adds the new Boom Shorts ecosystem to the EXISTING database.
--
--   * every CREATE TABLE / ADD COLUMN / CREATE INDEX uses IF NOT EXISTS
--   * every policy is dropped first, then re-created
--   * every constraint is dropped first, then re-created
--
-- Nothing is dropped, truncated or deleted. Existing packages, orders and
-- customers are untouched. Running this twice is harmless.
--
-- How to run: Supabase -> SQL Editor -> paste -> Run
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- from drizzle/0000_special_donald_blake.sql
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'banner' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"discount_percent" integer DEFAULT 10 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);

CREATE TABLE IF NOT EXISTS "faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "gallery" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "notices" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "orders" (
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
);

CREATE TABLE IF NOT EXISTS "packages" (
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
);

CREATE TABLE IF NOT EXISTS "sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"video_url" text DEFAULT '' NOT NULL,
	"video_thumbnail_url" text DEFAULT '' NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"site_name" text DEFAULT 'Mihad Boom Shorts' NOT NULL,
	"logo_text" text DEFAULT 'Mihad Boom Shorts' NOT NULL,
	"hero_badge_text" text DEFAULT 'TRUSTED SELLER • SHORTS CREATOR ⚡ FAST DELIVERY' NOT NULL,
	"hero_title" text DEFAULT 'Premium Boom Shorts & Voice Over Shorts Videos' NOT NULL,
	"hero_subtitle" text DEFAULT 'Order high-quality Boom Shorts, professional voice over videos, and complete YouTube channel management. Ready-to-upload content designed to grow your channel faster.' NOT NULL,
	"stat_happy_clients" text DEFAULT '10K+' NOT NULL,
	"stat_completed_orders" text DEFAULT '500+' NOT NULL,
	"stat_seo_optimized" text DEFAULT '100%' NOT NULL,
	"whatsapp_number" text DEFAULT '8801609371023' NOT NULL,
	"whatsapp_link" text DEFAULT 'https://wa.me/8801609371023' NOT NULL,
	"messenger_link" text DEFAULT '' NOT NULL,
	"facebook_link" text DEFAULT '' NOT NULL,
	"telegram_link" text DEFAULT '' NOT NULL,
	"bkash_number" text DEFAULT '01609371023' NOT NULL,
	"nagad_number" text DEFAULT '' NOT NULL,
	"rocket_number" text DEFAULT '' NOT NULL,
	"qr_code_url" text DEFAULT '' NOT NULL,
	"payment_notice" text DEFAULT 'Send Money করার পর Transaction ID অবশ্যই সঠিকভাবে দিন। ভুল তথ্যের জন্য অর্ডার Reject হতে পারে।' NOT NULL,
	"youtube_video_url" text DEFAULT '' NOT NULL,
	"youtube_thumbnail_url" text DEFAULT '' NOT NULL,
	"youtube_title" text DEFAULT 'Watch How We Create Viral Boom Shorts' NOT NULL,
	"free_video_link" text DEFAULT '' NOT NULL,
	"offer_enabled" boolean DEFAULT false NOT NULL,
	"offer_text" text DEFAULT 'Limited Time Offer!' NOT NULL,
	"offer_ends_at" timestamp with time zone,
	"admin_password_hash" text NOT NULL,
	"total_visitors" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text DEFAULT '' NOT NULL,
	"message" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);


-- ---------------------------------------------------------------------------
-- from drizzle/0001_goofy_chameleon.sql
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "free_video_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"thumbnail_url" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "proof_slides" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

ALTER TABLE "settings" ALTER COLUMN "facebook_link" SET DEFAULT 'https://www.facebook.com/profile.php?id=61592401763665';
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "logo_url" text DEFAULT '/logo.png' NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "demo_video_url" text DEFAULT '' NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "boom_video_url" text DEFAULT '' NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "boom_video_thumbnail_url" text DEFAULT '' NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "service_video_url" text DEFAULT '' NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "service_video_thumbnail_url" text DEFAULT '' NOT NULL;

-- ---------------------------------------------------------------------------
-- from drizzle/0002_boom_ecosystem.sql
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT 'Admin' NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "customer_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"whatsapp" text NOT NULL,
	"email" text,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"package_id" integer,
	"package_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS "package_features" (
	"id" serial PRIMARY KEY NOT NULL,
	"package_id" integer NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"method" text NOT NULL,
	"transaction_id" text NOT NULL,
	"sender_number" text DEFAULT '' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"screenshot_path" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'unverified' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "coupons" ALTER COLUMN "discount_percent" SET DEFAULT 0;
ALTER TABLE "settings" ALTER COLUMN "admin_password_hash" SET DEFAULT '';
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "subtitle" text DEFAULT '' NOT NULL;
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "button_text" text DEFAULT '' NOT NULL;
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "button_link" text DEFAULT '' NOT NULL;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "min_order_amount" numeric(10, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "usage_limit" integer;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "used_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "order_number" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_id" integer;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "base_price" numeric(10, 2);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "final_amount" numeric(10, 2);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'unverified' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "admin_note" text DEFAULT '' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "status_updated_at" timestamp with time zone;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "short_description" text DEFAULT '' NOT NULL;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "duration_label" text DEFAULT '' NOT NULL;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "video_quantity" integer DEFAULT 0 NOT NULL;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "youtube_demo_url" text DEFAULT '' NOT NULL;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "discount_percent" integer DEFAULT 0 NOT NULL;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "is_best_seller" boolean DEFAULT false NOT NULL;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "available" boolean DEFAULT true NOT NULL;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "archived" boolean DEFAULT false NOT NULL;
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "approved" boolean DEFAULT false NOT NULL;
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "customer_id" integer;
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "order_id" integer;
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "admin_sessions" DROP CONSTRAINT IF EXISTS "admin_sessions_admin_user_id_admin_users_id_fk";
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "customer_sessions" DROP CONSTRAINT IF EXISTS "customer_sessions_customer_id_customers_id_fk";
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_order_id_orders_id_fk";
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_package_id_packages_id_fk";
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "package_features" DROP CONSTRAINT IF EXISTS "package_features_package_id_packages_id_fk";
ALTER TABLE "package_features" ADD CONSTRAINT "package_features_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_order_id_orders_id_fk";
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "admin_sessions_exp_idx" ON "admin_sessions" USING btree ("expires_at");
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_email_uidx" ON "admin_users" USING btree ("email");
CREATE INDEX IF NOT EXISTS "customer_sessions_exp_idx" ON "customer_sessions" USING btree ("expires_at");
CREATE UNIQUE INDEX IF NOT EXISTS "customers_whatsapp_uidx" ON "customers" USING btree ("whatsapp");
CREATE INDEX IF NOT EXISTS "order_items_order_idx" ON "order_items" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "package_features_pkg_idx" ON "package_features" USING btree ("package_id","sort_order");
CREATE INDEX IF NOT EXISTS "payments_order_idx" ON "payments" USING btree ("order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "payments_txn_uidx" ON "payments" USING btree ("method","transaction_id");
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_customer_id_customers_id_fk";
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "testimonials" DROP CONSTRAINT IF EXISTS "testimonials_customer_id_customers_id_fk";
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "testimonials" DROP CONSTRAINT IF EXISTS "testimonials_order_id_orders_id_fk";
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_number_uidx" ON "orders" USING btree ("order_number");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" USING btree ("status");
CREATE INDEX IF NOT EXISTS "orders_created_idx" ON "orders" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "orders_customer_idx" ON "orders" USING btree ("customer_id");
CREATE INDEX IF NOT EXISTS "orders_whatsapp_idx" ON "orders" USING btree ("whatsapp");
CREATE INDEX IF NOT EXISTS "packages_home_idx" ON "packages" USING btree ("archived","visible","sort_order");
CREATE INDEX IF NOT EXISTS "packages_category_idx" ON "packages" USING btree ("category");
CREATE INDEX IF NOT EXISTS "testimonials_public_idx" ON "testimonials" USING btree ("approved","visible","sort_order");
-- ===========================================================================
-- DATA BACKFILL — preserves every existing row.
-- Purely additive above; nothing is dropped or truncated.
-- Each statement is idempotent (guarded by IS NULL / = default) so re-running
-- the migration against an already-migrated database is a no-op.
-- ===========================================================================

-- 1. Give every existing order a stable, human-facing order number.
UPDATE "orders"
SET "order_number" = 'BBS-' || lpad("id"::text, 6, '0')
WHERE "order_number" IS NULL;


-- 2. Mirror the legacy single `price` column into the new pricing columns so
--    historical orders report correct base/final amounts.
UPDATE "orders"
SET "base_price" = "price",
    "final_amount" = "price"
WHERE "final_amount" IS NULL;


-- 3. Derive payment_status from the legacy workflow status.
UPDATE "orders"
SET "payment_status" = CASE
      WHEN "status" IN ('confirmed', 'completed') THEN 'confirmed'
      WHEN "status" IN ('rejected', 'cancelled') THEN 'rejected'
      ELSE 'unverified'
    END
WHERE "payment_status" = 'unverified' AND "status" <> 'pending';


-- 4. Existing `badge = 'bestseller'` packages become the new Best Seller flag.
UPDATE "packages" SET "is_best_seller" = true
WHERE "badge" = 'bestseller' AND "is_best_seller" = false;


-- 5. Derive a card blurb from the long description where none was entered.
UPDATE "packages"
SET "short_description" = left(regexp_replace("description", '\s+', ' ', 'g'), 110)
WHERE "short_description" = '' AND "description" <> '';


-- 6. CRITICAL: existing public reviews must stay public. Without this the new
--    `approved` gate would hide every review already on the site.
UPDATE "testimonials" SET "approved" = true
WHERE "approved" = false AND "visible" = true;


-- 7. Rebuild order_items / payments for historical orders so the Admin App's
--    Orders and Payments views show complete data for old records too.
INSERT INTO "order_items" ("order_id", "package_id", "package_name", "quantity", "unit_price", "discount_amount", "line_total")
SELECT o."id", o."package_id", o."package_name", 1, o."price", o."discount_amount", o."price"
FROM "orders" o
WHERE NOT EXISTS (SELECT 1 FROM "order_items" oi WHERE oi."order_id" = o."id");


INSERT INTO "payments" ("order_id", "method", "transaction_id", "sender_number", "amount", "screenshot_path", "status", "verified_at")
SELECT o."id", o."payment_method", o."transaction_id", o."whatsapp", o."price", o."screenshot_url", o."payment_status",
       CASE WHEN o."payment_status" = 'confirmed' THEN o."created_at" ELSE NULL END
FROM "orders" o
WHERE o."transaction_id" <> ''
  AND NOT EXISTS (SELECT 1 FROM "payments" p WHERE p."order_id" = o."id")
ON CONFLICT ("method", "transaction_id") DO NOTHING;


-- 8. Link existing orders to a customer record (created on the fly, deduped
--    by WhatsApp number) so the Admin Customers view is not empty.
INSERT INTO "customers" ("name", "whatsapp", "created_at")
SELECT DISTINCT ON (o."whatsapp") o."customer_name", o."whatsapp", min(o."created_at")
FROM "orders" o
GROUP BY o."whatsapp", o."customer_name", o."id"
ON CONFLICT ("whatsapp") DO NOTHING;


UPDATE "orders" o
SET "customer_id" = c."id"
FROM "customers" c
WHERE o."customer_id" IS NULL AND lower(c."whatsapp") = lower(o."whatsapp");


-- ---------------------------------------------------------------------------
-- from drizzle/rls-policies.sql
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- BOOM SHORTS — Row Level Security policies
--
-- Apply ONCE against the Supabase project:
--     psql "$DATABASE_URL" -f drizzle/rls-policies.sql
--   or paste into the Supabase SQL Editor.
--
-- ---------------------------------------------------------------------------
-- IMPORTANT — READ THIS BEFORE RELYING ON RLS
-- ---------------------------------------------------------------------------
-- The Next.js app connects with the pooler/superuser role. Postgres does NOT
-- enforce RLS against a table's owner or a superuser, so these policies do
-- not change how the server-side Drizzle queries behave.
--
-- Authorisation in this system is enforced in TWO places:
--   1. Server-side, in every API route handler / server component
--      (src/lib/requireAdmin.ts, src/lib/requireCustomer.ts).
--      This is the layer that actually protects today's traffic.
--   2. These RLS policies — defence in depth. They become the primary
--      protection the moment anything talks to Supabase with the *anon* key
--      (e.g. a future native Android admin app, or the Supabase JS client in
--      the browser). Without them, handing out the anon key would leak every
--      customer's orders.
--
-- Net effect: applying this file is safe (owner connections are unaffected)
-- and it makes the anon key safe to publish.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
ALTER TABLE settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_features   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections           ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery            ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_slides       ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_video_cards   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sessions  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- PUBLIC CONTENT — readable by anyone (anon), writable by nobody.
-- All writes go through the authenticated Admin App using the server key.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "public read packages"          ON packages;
DROP POLICY IF EXISTS "public read packages" ON packages;
CREATE POLICY "public read packages" ON packages
  FOR SELECT TO anon, authenticated
  USING (archived = false);

DROP POLICY IF EXISTS "public read package features"   ON package_features;
DROP POLICY IF EXISTS "public read package features" ON package_features;
CREATE POLICY "public read package features" ON package_features
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read banners"            ON banners;
DROP POLICY IF EXISTS "public read banners" ON banners;
CREATE POLICY "public read banners" ON banners
  FOR SELECT TO anon, authenticated USING (visible = true);

DROP POLICY IF EXISTS "public read notices"            ON notices;
DROP POLICY IF EXISTS "public read notices" ON notices;
CREATE POLICY "public read notices" ON notices
  FOR SELECT TO anon, authenticated USING (visible = true);

DROP POLICY IF EXISTS "public read faqs"               ON faqs;
DROP POLICY IF EXISTS "public read faqs" ON faqs;
CREATE POLICY "public read faqs" ON faqs
  FOR SELECT TO anon, authenticated USING (visible = true);

DROP POLICY IF EXISTS "public read gallery"            ON gallery;
DROP POLICY IF EXISTS "public read gallery" ON gallery;
CREATE POLICY "public read gallery" ON gallery
  FOR SELECT TO anon, authenticated USING (visible = true);

DROP POLICY IF EXISTS "public read proof slides"       ON proof_slides;
DROP POLICY IF EXISTS "public read proof slides" ON proof_slides;
CREATE POLICY "public read proof slides" ON proof_slides
  FOR SELECT TO anon, authenticated USING (visible = true);

DROP POLICY IF EXISTS "public read free video cards"   ON free_video_cards;
DROP POLICY IF EXISTS "public read free video cards" ON free_video_cards;
CREATE POLICY "public read free video cards" ON free_video_cards
  FOR SELECT TO anon, authenticated USING (visible = true);

DROP POLICY IF EXISTS "public read sections"           ON sections;
DROP POLICY IF EXISTS "public read sections" ON sections;
CREATE POLICY "public read sections" ON sections
  FOR SELECT TO anon, authenticated USING (visible = true);

-- Reviews: only admin-approved AND visible rows are publicly readable.
DROP POLICY IF EXISTS "public read approved reviews"   ON testimonials;
DROP POLICY IF EXISTS "public read approved reviews" ON testimonials;
CREATE POLICY "public read approved reviews" ON testimonials
  FOR SELECT TO anon, authenticated
  USING (approved = true AND visible = true);

-- Settings: the row contains payment numbers and social links the site needs,
-- but ALSO admin_password_hash. Reading it with anon would leak the hash, so
-- anon gets NO access; the server reads it with the privileged role and strips
-- sensitive fields before rendering.
-- (No policy created => default deny. This is intentional.)

-- ---------------------------------------------------------------------------
-- CUSTOMER PRIVATE DATA
--
-- `request.jwt.claims ->> 'sub'` is the customer id set by Supabase Auth.
-- A customer may only ever touch their own rows.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "customer reads own orders"      ON orders;
DROP POLICY IF EXISTS "customer reads own orders" ON orders;
CREATE POLICY "customer reads own orders" ON orders
  FOR SELECT TO authenticated
  USING (customer_id = nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::int);

DROP POLICY IF EXISTS "customer reads own order items" ON order_items;
DROP POLICY IF EXISTS "customer reads own order items" ON order_items;
CREATE POLICY "customer reads own order items" ON order_items
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id = nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::int
    )
  );

DROP POLICY IF EXISTS "customer reads own profile"     ON customers;
DROP POLICY IF EXISTS "customer reads own profile" ON customers;
CREATE POLICY "customer reads own profile" ON customers
  FOR SELECT TO authenticated
  USING (id = nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::int);

-- Payments contain transaction ids and screenshot paths: server-only.
-- (No policy => default deny for anon/authenticated.)

-- ---------------------------------------------------------------------------
-- ADMIN-ONLY TABLES — default deny for anon and authenticated.
-- Only the privileged server role (table owner) can read/write these.
-- ---------------------------------------------------------------------------
-- admin_users, admin_sessions, customer_sessions, payments, settings, coupons
-- intentionally have NO permissive policy, which means deny-by-default.

-- ---------------------------------------------------------------------------
-- Sanity check: confirm RLS is on for every table.
-- ---------------------------------------------------------------------------
-- SELECT relname, relrowsecurity FROM pg_class
-- WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace
-- ORDER BY relname;
