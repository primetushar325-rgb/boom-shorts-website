CREATE TABLE "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'banner' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"discount_percent" integer DEFAULT 10 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
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
--> statement-breakpoint
CREATE TABLE "packages" (
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
--> statement-breakpoint
CREATE TABLE "sections" (
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
--> statement-breakpoint
CREATE TABLE "settings" (
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
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text DEFAULT '' NOT NULL,
	"message" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
