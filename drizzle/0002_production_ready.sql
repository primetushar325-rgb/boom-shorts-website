-- 0003: production-ready additive migration (safe to run on a live database).
-- Every statement is idempotent; no table is dropped and no row is deleted.
-- The app also applies this automatically at runtime (src/db/ensureSchema.ts),
-- so running it manually is optional.

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text DEFAULT '' NOT NULL,
  "phone" text NOT NULL,
  "pin_hash" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customers_phone_uidx" ON "customers" ("phone");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviews" (
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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_status_idx" ON "reviews" ("status");
--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "discount_type" text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "discount_value" numeric(10, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "best_seller" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "quantity_label" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "features" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "demo_video_url" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "available" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "show_on_home" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "order_code" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_id" integer;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "package_quantity" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "quantity" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "unit_price" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "original_price" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "coupon_discount" numeric(10, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_number" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "admin_note" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "orders" SET "order_code" = 'BS-' || upper(substr(md5(random()::text || "id"::text), 1, 6)) WHERE "order_code" IS NULL;
--> statement-breakpoint
UPDATE "orders" SET "unit_price" = "price" WHERE "unit_price" IS NULL;
--> statement-breakpoint
UPDATE "orders" SET "original_price" = "price" WHERE "original_price" IS NULL;
--> statement-breakpoint
UPDATE "orders" SET "status" = 'payment_verified' WHERE "status" = 'confirmed';
--> statement-breakpoint
UPDATE "orders" SET "payment_status" = 'verified' WHERE "status" IN ('payment_verified', 'processing', 'completed') AND "payment_status" = 'pending';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_code_uidx" ON "orders" ("order_code");
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "discount_type" text DEFAULT 'percent' NOT NULL;
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "discount_value" numeric(10, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "min_order" numeric(10, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "usage_limit" integer;
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "used_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "coupons" SET "discount_value" = "discount_percent" WHERE "discount_value" = 0 AND "discount_percent" > 0;
--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "description" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "button_text" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "button_url" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "youtube_description" text DEFAULT '' NOT NULL;
--> statement-breakpoint
-- Row Level Security: deny-by-default for the public Supabase API keys.
-- The application talks to Postgres as the owner role from server routes only.
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "packages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "banners" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "notices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "testimonials" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "faqs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "gallery" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sections" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "proof_slides" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "free_video_cards" ENABLE ROW LEVEL SECURITY;
