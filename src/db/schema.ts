import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Settings (singleton row, id = 1) — everything the admin can tweak globally
// ---------------------------------------------------------------------------
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),

  siteName: text("site_name").notNull().default("Mihad Boom Shorts"),
  logoText: text("logo_text").notNull().default("Mihad Boom Shorts"),
  logoUrl: text("logo_url").notNull().default("/logo.png"),

  // "Demo" top button — Google Drive (or any) video link, editable from admin
  demoVideoUrl: text("demo_video_url").notNull().default(""),

  // Autoplay-on-scroll video box shown at the top of the Boom Shorts / Services package sections
  boomVideoUrl: text("boom_video_url").notNull().default(""),
  boomVideoThumbnailUrl: text("boom_video_thumbnail_url").notNull().default(""),
  serviceVideoUrl: text("service_video_url").notNull().default(""),
  serviceVideoThumbnailUrl: text("service_video_thumbnail_url").notNull().default(""),

  heroBadgeText: text("hero_badge_text")
    .notNull()
    .default("TRUSTED SELLER • SHORTS CREATOR ⚡ FAST DELIVERY"),
  heroTitle: text("hero_title")
    .notNull()
    .default("Premium Boom Shorts & Voice Over Shorts Videos"),
  heroSubtitle: text("hero_subtitle")
    .notNull()
    .default(
      "Order high-quality Boom Shorts, professional voice over videos, and complete YouTube channel management. Ready-to-upload content designed to grow your channel faster.",
    ),
  statHappyClients: text("stat_happy_clients").notNull().default("10K+"),
  statCompletedOrders: text("stat_completed_orders").notNull().default("500+"),
  statSeoOptimized: text("stat_seo_optimized").notNull().default("100%"),

  // Social / contact links
  whatsappNumber: text("whatsapp_number").notNull().default("8801609371023"),
  whatsappLink: text("whatsapp_link")
    .notNull()
    .default("https://wa.me/8801609371023"),
  messengerLink: text("messenger_link").notNull().default(""),
  facebookLink: text("facebook_link")
    .notNull()
    .default("https://www.facebook.com/profile.php?id=61592401763665"),
  telegramLink: text("telegram_link").notNull().default(""),

  // Payment settings
  bkashNumber: text("bkash_number").notNull().default("01609371023"),
  nagadNumber: text("nagad_number").notNull().default(""),
  rocketNumber: text("rocket_number").notNull().default(""),
  qrCodeUrl: text("qr_code_url").notNull().default(""),
  paymentNotice: text("payment_notice")
    .notNull()
    .default("Send Money করার পর Transaction ID অবশ্যই সঠিকভাবে দিন। ভুল তথ্যের জন্য অর্ডার Reject হতে পারে।"),

  // Featured YouTube video
  youtubeVideoUrl: text("youtube_video_url").notNull().default(""),
  youtubeThumbnailUrl: text("youtube_thumbnail_url").notNull().default(""),
  youtubeTitle: text("youtube_title")
    .notNull()
    .default("Watch How We Create Viral Boom Shorts"),

  // Free video button
  freeVideoLink: text("free_video_link").notNull().default(""),

  // Offer countdown
  offerEnabled: boolean("offer_enabled").notNull().default(false),
  offerText: text("offer_text").notNull().default("Limited Time Offer!"),
  offerEndsAt: timestamp("offer_ends_at", { withTimezone: true }),

  // Admin auth
  adminPasswordHash: text("admin_password_hash").notNull(),

  // Visitor counter
  totalVisitors: integer("total_visitors").notNull().default(0),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Packages — used for both "Boom Shorts" and "Other Services" sections
// ---------------------------------------------------------------------------
export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  category: text("category").notNull().default("boom"), // 'boom' | 'service'
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  oldPrice: numeric("old_price", { precision: 10, scale: 2 }),
  newPrice: numeric("new_price", { precision: 10, scale: 2 }).notNull(),
  badge: text("badge").notNull().default("none"), // none|popular|bestseller|new
  buttonText: text("button_text").notNull().default("Order Now"),
  icon: text("icon").notNull().default("🎬"),
  visible: boolean("visible").notNull().default(true),
  recentlyAdded: boolean("recently_added").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  packageId: integer("package_id"),
  packageName: text("package_name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  couponCode: text("coupon_code"),
  paymentMethod: text("payment_method").notNull().default("bKash"),
  transactionId: text("transaction_id").notNull(),
  screenshotUrl: text("screenshot_url").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending|confirmed|completed|rejected
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Unlimited custom sections (admin can create/rename/delete/show-hide/sort)
// ---------------------------------------------------------------------------
export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  videoUrl: text("video_url").notNull().default(""),
  videoThumbnailUrl: text("video_thumbnail_url").notNull().default(""),
  items: jsonb("items").notNull().default([]),
  visible: boolean("visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Banners / Offer banners
// ---------------------------------------------------------------------------
export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  link: text("link").notNull().default(""),
  type: text("type").notNull().default("banner"), // banner|offer
  visible: boolean("visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Notice board
// ---------------------------------------------------------------------------
export const notices = pgTable("notices", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  visible: boolean("visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------
export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url").notNull().default(""),
  message: text("message").notNull(),
  rating: integer("rating").notNull().default(5),
  visible: boolean("visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------
export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  visible: boolean("visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------
export const gallery = pgTable("gallery", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption").notNull().default(""),
  visible: boolean("visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Client Review proof slides — auto-sliding screenshot proof carousel (below hero)
// ---------------------------------------------------------------------------
export const proofSlides = pgTable("proof_slides", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption").notNull().default(""),
  visible: boolean("visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Free Video cards — shown on the /free page, each card links out
// ---------------------------------------------------------------------------
export const freeVideoCards = pgTable("free_video_cards", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull().default(""),
  link: text("link").notNull().default(""),
  visible: boolean("visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountPercent: integer("discount_percent").notNull().default(10),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
