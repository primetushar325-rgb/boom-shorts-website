import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ===========================================================================
// BOOM SHORTS — shared database schema
//
// Used by BOTH the Customer Website and the Admin App.
// All money values are numeric(10,2) and come back from Drizzle as strings —
// always coerce with Number() at the boundary (see src/lib/pricing.ts).
// ===========================================================================

// ---------------------------------------------------------------------------
// Site settings (singleton row, id = 1)
// Everything the admin can tweak globally. No secrets live here except the
// legacy admin password hash, which is superseded by `adminUsers`.
// ---------------------------------------------------------------------------
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),

  siteName: text("site_name").notNull().default("Mihad Boom Shorts"),
  logoText: text("logo_text").notNull().default("Mihad Boom Shorts"),
  logoUrl: text("logo_url").notNull().default("/logo.png"),

  // "Demo" top button — Google Drive (or any) video link
  demoVideoUrl: text("demo_video_url").notNull().default(""),

  // Autoplay-on-scroll video boxes
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

  // Social / contact
  whatsappNumber: text("whatsapp_number").notNull().default("8801609371023"),
  whatsappLink: text("whatsapp_link").notNull().default("https://wa.me/8801609371023"),
  messengerLink: text("messenger_link").notNull().default(""),
  facebookLink: text("facebook_link")
    .notNull()
    .default("https://www.facebook.com/profile.php?id=61592401763665"),
  telegramLink: text("telegram_link").notNull().default(""),

  // Payment
  bkashNumber: text("bkash_number").notNull().default("01609371023"),
  nagadNumber: text("nagad_number").notNull().default(""),
  rocketNumber: text("rocket_number").notNull().default(""),
  qrCodeUrl: text("qr_code_url").notNull().default(""),
  paymentNotice: text("payment_notice")
    .notNull()
    .default(
      "Send Money করার পর Transaction ID অবশ্যই সঠিকভাবে দিন। ভুল তথ্যের জন্য অর্ডার Reject হতে পারে।",
    ),

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

  /**
   * LEGACY — single shared admin password. Superseded by `adminUsers`.
   * Kept only so existing installs keep working until an admin user exists.
   */
  adminPasswordHash: text("admin_password_hash").notNull().default(""),

  totalVisitors: integer("total_visitors").notNull().default(0),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Customers — created implicitly on first order, or via account sign-in
// ---------------------------------------------------------------------------
export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    whatsapp: text("whatsapp").notNull(),
    email: text("email"),
    /** bcrypt/scrypt hash — null for customers who only ever placed a guest order */
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("customers_whatsapp_uidx").on(t.whatsapp)],
);

// ---------------------------------------------------------------------------
// Packages — "Boom Shorts" and "Other Services" cards
//
// Pricing model (server-authoritative, see src/lib/pricing.ts):
//   basePrice      = newPrice           ← what the admin enters as "Price"
//   discountAmount = discountAmount > 0 ? discountAmount
//                                       : round(basePrice * discountPercent / 100)
//   finalPrice     = max(0, basePrice - discountAmount)
//   oldPrice       = strikethrough "was" price shown on the card
// The frontend never sends a price. Ever.
// ---------------------------------------------------------------------------
export const packages = pgTable(
  "packages",
  {
    id: serial("id").primaryKey(),
    category: text("category").notNull().default("boom"), // 'boom' | 'service'
    name: text("name").notNull(),
    /** Full description (admin/detail view) */
    description: text("description").notNull().default(""),
    /** One-line blurb shown on the compact card */
    shortDescription: text("short_description").notNull().default(""),
    /** e.g. "7 Days", "Monthly" */
    durationLabel: text("duration_label").notNull().default(""),
    /** e.g. 8 for a "7+1" package */
    videoQuantity: integer("video_quantity").notNull().default(0),
    /** YouTube watch/youtu.be/embed URL — id extracted server-side */
    youtubeDemoUrl: text("youtube_demo_url").notNull().default(""),

    oldPrice: numeric("old_price", { precision: 10, scale: 2 }),
    newPrice: numeric("new_price", { precision: 10, scale: 2 }).notNull(),
    discountPercent: integer("discount_percent").notNull().default(0),
    discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),

    badge: text("badge").notNull().default("none"), // none|popular|bestseller|new
    isBestSeller: boolean("is_best_seller").notNull().default(false),
    buttonText: text("button_text").notNull().default("Order Now"),
    icon: text("icon").notNull().default("🎬"),

    /** Show on Homepage — hidden packages stay in the DB, they just don't render */
    visible: boolean("visible").notNull().default(true),
    /** Available for ordering. Unavailable packages render but cannot be ordered */
    available: boolean("available").notNull().default(true),
    /** Soft delete — archived packages are invisible everywhere in the customer site */
    archived: boolean("archived").notNull().default(false),
    recentlyAdded: boolean("recently_added").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("packages_home_idx").on(t.archived, t.visible, t.sortOrder),
    index("packages_category_idx").on(t.category),
  ],
);

// ---------------------------------------------------------------------------
// Package features — the 3–5 ✓ bullet points on a card
// ---------------------------------------------------------------------------
export const packageFeatures = pgTable(
  "package_features",
  {
    id: serial("id").primaryKey(),
    packageId: integer("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("package_features_pkg_idx").on(t.packageId, t.sortOrder)],
);

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    /** Human-facing id, e.g. BBS-102948 */
    orderNumber: text("order_number"),
    customerId: integer("customer_id").references(() => customers.id),

    customerName: text("customer_name").notNull(),
    whatsapp: text("whatsapp").notNull(),
    packageId: integer("package_id"),
    packageName: text("package_name").notNull(),

    /** LEGACY column — kept for backward compatibility, mirrors finalAmount */
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    basePrice: numeric("base_price", { precision: 10, scale: 2 }),
    discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    finalAmount: numeric("final_amount", { precision: 10, scale: 2 }),

    couponCode: text("coupon_code"),
    paymentMethod: text("payment_method").notNull().default("bKash"),
    transactionId: text("transaction_id").notNull(),
    /** Supabase Storage object path (preferred) or absolute public URL (legacy) */
    screenshotUrl: text("screenshot_url").notNull().default(""),

    /** pending|confirmed|completed|rejected|cancelled — 'pending' = Payment Verification */
    status: text("status").notNull().default("pending"),
    /** unverified|confirmed|rejected|refunded */
    paymentStatus: text("payment_status").notNull().default("unverified"),
    /** Internal only — never sent to the customer site */
    adminNote: text("admin_note").notNull().default(""),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("orders_order_number_uidx").on(t.orderNumber),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
    index("orders_customer_idx").on(t.customerId),
    index("orders_whatsapp_idx").on(t.whatsapp),
  ],
);

// ---------------------------------------------------------------------------
// Order items — one row per ordered package (future-proofs multi-item orders)
// ---------------------------------------------------------------------------
export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    packageId: integer("package_id").references(() => packages.id),
    packageName: text("package_name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

// ---------------------------------------------------------------------------
// Payments — the payment record + screenshot reference for an order
// ---------------------------------------------------------------------------
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: text("method").notNull(), // bKash | Nagad
    transactionId: text("transaction_id").notNull(),
    /** The number the customer sent money FROM */
    senderNumber: text("sender_number").notNull().default(""),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    screenshotPath: text("screenshot_path").notNull().default(""),
    status: text("status").notNull().default("unverified"),
    note: text("note").notNull().default(""),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("payments_order_idx").on(t.orderId),
    // Stops the same bKash/Nagad transaction id being reused on another order.
    uniqueIndex("payments_txn_uidx").on(t.method, t.transactionId),
  ],
);

// ---------------------------------------------------------------------------
// Unlimited custom sections (admin create/rename/delete/show-hide/sort)
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Banners / offer banners
// ---------------------------------------------------------------------------
export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default(""),
  subtitle: text("subtitle").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  link: text("link").notNull().default(""),
  buttonText: text("button_text").notNull().default(""),
  buttonLink: text("button_link").notNull().default(""),
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
// Reviews (was `testimonials`) — admin approves before they appear publicly
// ---------------------------------------------------------------------------
export const testimonials = pgTable(
  "testimonials",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url").notNull().default(""),
    message: text("message").notNull(),
    rating: integer("rating").notNull().default(5),
    /** Admin approval gate — the customer site only shows approved + visible */
    approved: boolean("approved").notNull().default(false),
    customerId: integer("customer_id").references(() => customers.id),
    orderId: integer("order_id").references(() => orders.id),
    visible: boolean("visible").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("testimonials_public_idx").on(t.approved, t.visible, t.sortOrder)],
);

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
// Client-review proof slides (auto-sliding carousel below hero)
// ---------------------------------------------------------------------------
export const proofSlides = pgTable("proof_slides", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption").notNull().default(""),
  visible: boolean("visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Free video cards — /free page
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
  discountPercent: integer("discount_percent").notNull().default(0),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Admin users — real per-user accounts (replaces the shared password)
// ---------------------------------------------------------------------------
export const adminUsers = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull().default("Admin"),
    /** scrypt hash, format: scrypt$N$r$p$saltHex$hashHex */
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("admin"),
    active: boolean("active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("admin_users_email_uidx").on(t.email)],
);

// ---------------------------------------------------------------------------
// Admin sessions — opaque random token, server-side revocable
// ---------------------------------------------------------------------------
export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: text("id").primaryKey(),
    adminUserId: integer("admin_user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_sessions_exp_idx").on(t.expiresAt)],
);

// ---------------------------------------------------------------------------
// Customer sessions — for the "Orders / Profile" account area
// ---------------------------------------------------------------------------
export const customerSessions = pgTable(
  "customer_sessions",
  {
    id: text("id").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("customer_sessions_exp_idx").on(t.expiresAt)],
);
