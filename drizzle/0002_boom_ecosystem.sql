CREATE TABLE "admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
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
--> statement-breakpoint
CREATE TABLE "customer_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"whatsapp" text NOT NULL,
	"email" text,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"package_id" integer,
	"package_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_features" (
	"id" serial PRIMARY KEY NOT NULL,
	"package_id" integer NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
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
--> statement-breakpoint
ALTER TABLE "coupons" ALTER COLUMN "discount_percent" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "admin_password_hash" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "subtitle" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "button_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "button_link" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "min_order_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "usage_limit" integer;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "used_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "base_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "final_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "admin_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "status_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "short_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "duration_label" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "video_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "youtube_demo_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "discount_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "is_best_seller" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "available" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "customer_id" integer;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "order_id" integer;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_features" ADD CONSTRAINT "package_features_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_sessions_exp_idx" ON "admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_uidx" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customer_sessions_exp_idx" ON "customer_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_whatsapp_uidx" ON "customers" USING btree ("whatsapp");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "package_features_pkg_idx" ON "package_features" USING btree ("package_id","sort_order");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_txn_uidx" ON "payments" USING btree ("method","transaction_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_uidx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_whatsapp_idx" ON "orders" USING btree ("whatsapp");--> statement-breakpoint
CREATE INDEX "packages_home_idx" ON "packages" USING btree ("archived","visible","sort_order");--> statement-breakpoint
CREATE INDEX "packages_category_idx" ON "packages" USING btree ("category");--> statement-breakpoint
CREATE INDEX "testimonials_public_idx" ON "testimonials" USING btree ("approved","visible","sort_order");--> statement-breakpoint
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
--> statement-breakpoint

-- 2. Mirror the legacy single `price` column into the new pricing columns so
--    historical orders report correct base/final amounts.
UPDATE "orders"
SET "base_price" = "price",
    "final_amount" = "price"
WHERE "final_amount" IS NULL;
--> statement-breakpoint

-- 3. Derive payment_status from the legacy workflow status.
UPDATE "orders"
SET "payment_status" = CASE
      WHEN "status" IN ('confirmed', 'completed') THEN 'confirmed'
      WHEN "status" IN ('rejected', 'cancelled') THEN 'rejected'
      ELSE 'unverified'
    END
WHERE "payment_status" = 'unverified' AND "status" <> 'pending';
--> statement-breakpoint

-- 4. Existing `badge = 'bestseller'` packages become the new Best Seller flag.
UPDATE "packages" SET "is_best_seller" = true
WHERE "badge" = 'bestseller' AND "is_best_seller" = false;
--> statement-breakpoint

-- 5. Derive a card blurb from the long description where none was entered.
UPDATE "packages"
SET "short_description" = left(regexp_replace("description", '\s+', ' ', 'g'), 110)
WHERE "short_description" = '' AND "description" <> '';
--> statement-breakpoint

-- 6. CRITICAL: existing public reviews must stay public. Without this the new
--    `approved` gate would hide every review already on the site.
UPDATE "testimonials" SET "approved" = true
WHERE "approved" = false AND "visible" = true;
--> statement-breakpoint

-- 7. Rebuild order_items / payments for historical orders so the Admin App's
--    Orders and Payments views show complete data for old records too.
INSERT INTO "order_items" ("order_id", "package_id", "package_name", "quantity", "unit_price", "discount_amount", "line_total")
SELECT o."id", o."package_id", o."package_name", 1, o."price", o."discount_amount", o."price"
FROM "orders" o
WHERE NOT EXISTS (SELECT 1 FROM "order_items" oi WHERE oi."order_id" = o."id");
--> statement-breakpoint

INSERT INTO "payments" ("order_id", "method", "transaction_id", "sender_number", "amount", "screenshot_path", "status", "verified_at")
SELECT o."id", o."payment_method", o."transaction_id", o."whatsapp", o."price", o."screenshot_url", o."payment_status",
       CASE WHEN o."payment_status" = 'confirmed' THEN o."created_at" ELSE NULL END
FROM "orders" o
WHERE o."transaction_id" <> ''
  AND NOT EXISTS (SELECT 1 FROM "payments" p WHERE p."order_id" = o."id")
ON CONFLICT ("method", "transaction_id") DO NOTHING;
--> statement-breakpoint

-- 8. Link existing orders to a customer record (created on the fly, deduped
--    by WhatsApp number) so the Admin Customers view is not empty.
INSERT INTO "customers" ("name", "whatsapp", "created_at")
SELECT DISTINCT ON (o."whatsapp") o."customer_name", o."whatsapp", min(o."created_at")
FROM "orders" o
GROUP BY o."whatsapp", o."customer_name", o."id"
ON CONFLICT ("whatsapp") DO NOTHING;
--> statement-breakpoint

UPDATE "orders" o
SET "customer_id" = c."id"
FROM "customers" c
WHERE o."customer_id" IS NULL AND lower(c."whatsapp") = lower(o."whatsapp");
