CREATE TABLE "free_video_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"thumbnail_url" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proof_slides" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "facebook_link" SET DEFAULT 'https://www.facebook.com/profile.php?id=61592401763665';--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "logo_url" text DEFAULT '/logo.png' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "demo_video_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "boom_video_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "boom_video_thumbnail_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "service_video_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "service_video_thumbnail_url" text DEFAULT '' NOT NULL;