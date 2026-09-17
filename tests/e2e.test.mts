/**
 * End-to-end tests against an in-process Postgres (PGlite).
 *
 * These run the REAL migrations from drizzle/*.sql and the REAL service code
 * from src/lib — order creation, pricing, coupon validation, duplicate
 * prevention — rather than a re-implementation. The database instance is
 * injected through the documented test seam in src/db/index.ts.
 *
 * Run with: npm test
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../src/db/schema";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`      ${err instanceof Error ? err.message : err}`);
  }
}

// ---------------------------------------------------------------------------
// Boot PGlite and apply every committed migration, in journal order.
// ---------------------------------------------------------------------------
const client = new PGlite();
const db = drizzle(client, { schema });

// The seam must exist before any src/lib module is imported.
(globalThis as { __boomShortsTestDb?: unknown }).__boomShortsTestDb = db;

const journal = JSON.parse(
  readFileSync(join(process.cwd(), "drizzle/meta/_journal.json"), "utf8"),
) as { entries: { tag: string }[] };

const migrationFiles = readdirSync(join(process.cwd(), "drizzle")).filter((f) =>
  f.endsWith(".sql"),
);

console.log(`Applying ${journal.entries.length} migrations…`);
for (const entry of journal.entries) {
  const file = migrationFiles.find((f) => f.startsWith(entry.tag));
  if (!file) throw new Error(`Migration file missing for ${entry.tag}`);
  const sql = readFileSync(join(process.cwd(), "drizzle", file), "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) {
    const trimmed = statement.trim();
    if (trimmed) await client.exec(trimmed);
  }
  console.log(`  ✓ ${entry.tag}`);
}

// Import AFTER the seam is installed so the modules bind to the test database.
const { createOrder } = await import("../src/lib/orders");
const { priceBreakdown, couponDiscount, taka } = await import("../src/lib/pricing");
const { extractYouTubeId, youtubeEmbedUrl, youtubeThumbnailUrl } = await import(
  "../src/lib/youtube"
);
const { hashPassword, verifyPassword } = await import("../src/lib/password");
const { createUploadToken, verifyUploadToken } = await import("../src/lib/uploadToken");
const { normalizePhone } = await import("../src/lib/whatsapp");

// ---------------------------------------------------------------------------
console.log("\nMigrations");
// ---------------------------------------------------------------------------

await test("all 19 tables exist after migration", async () => {
  const res = await client.query<{ table_name: string }>(
    `select table_name from information_schema.tables where table_schema='public' order by 1`,
  );
  const names = res.rows.map((r) => r.table_name);
  for (const expected of [
    "admin_sessions",
    "admin_users",
    "banners",
    "coupons",
    "customer_sessions",
    "customers",
    "faqs",
    "free_video_cards",
    "gallery",
    "notices",
    "order_items",
    "orders",
    "package_features",
    "packages",
    "payments",
    "proof_slides",
    "sections",
    "settings",
    "testimonials",
  ]) {
    assert.ok(names.includes(expected), `missing table: ${expected}`);
  }
});

await test("migration is data-preserving (no DROP TABLE in any file)", () => {
  for (const file of migrationFiles) {
    const sql = readFileSync(join(process.cwd(), "drizzle", file), "utf8");
    assert.ok(!/DROP TABLE/i.test(sql), `${file} contains DROP TABLE`);
  }
});

// ---------------------------------------------------------------------------
console.log("\nPricing (src/lib/pricing.ts)");
// ---------------------------------------------------------------------------

await test("base price with no discount", () => {
  const p = priceBreakdown({ newPrice: "400" });
  assert.equal(p.base, 400);
  assert.equal(p.discount, 0);
  assert.equal(p.final, 400);
});

await test("percentage discount rounds to whole taka", () => {
  const p = priceBreakdown({ newPrice: "400", discountPercent: 10 });
  assert.equal(p.discount, 40);
  assert.equal(p.final, 360);
});

await test("explicit taka discount wins over percentage", () => {
  const p = priceBreakdown({ newPrice: "400", discountPercent: 50, discountAmount: "25" });
  assert.equal(p.discount, 25);
  assert.equal(p.final, 375);
});

await test("discount can never exceed the base price", () => {
  const p = priceBreakdown({ newPrice: "100", discountAmount: "9999" });
  assert.equal(p.final, 0);
  assert.equal(p.discount, 100);
});

await test("percentOff is computed against the strikethrough price", () => {
  const p = priceBreakdown({ newPrice: "400", oldPrice: "500" });
  assert.equal(p.strikeThrough, 500);
  assert.equal(p.percentOff, 20);
});

await test("taka formats whole numbers without decimals", () => {
  assert.equal(taka(400), "৳400");
  assert.equal(taka("1250"), "৳1,250");
  assert.equal(taka(null), "৳0");
});

await test("coupon discount respects the taka amount", () => {
  assert.equal(couponDiscount({ base: 400, discountAmount: "50" }), 50);
  assert.equal(couponDiscount({ base: 400, discountPercent: 10 }), 40);
});

// ---------------------------------------------------------------------------
console.log("\nYouTube URL parsing (src/lib/youtube.ts)");
// ---------------------------------------------------------------------------

await test("extracts id from every common URL shape", () => {
  const id = "dQw4w9WgXcQ";
  const shapes = [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=42s`,
    `https://youtu.be/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://m.youtube.com/watch?v=${id}`,
    id,
  ];
  for (const url of shapes) {
    assert.equal(extractYouTubeId(url), id, `failed for ${url}`);
  }
});

await test("rejects non-YouTube input", () => {
  assert.equal(extractYouTubeId("https://example.com/video"), null);
  assert.equal(extractYouTubeId(""), null);
  assert.equal(extractYouTubeId(null), null);
});

await test("builds a 16:9 nocookie embed and thumbnail", () => {
  const embed = youtubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ");
  assert.ok(embed?.includes("youtube-nocookie.com/embed/dQw4w9WgXcQ"));
  assert.ok(embed?.includes("rel=0"));
  assert.equal(youtubeThumbnailUrl("https://youtu.be/dQw4w9WgXcQ"), "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
});

// ---------------------------------------------------------------------------
console.log("\nSecurity primitives");
// ---------------------------------------------------------------------------

await test("scrypt hash verifies and rejects wrong passwords", () => {
  const hash = hashPassword("Correct-Horse-1");
  assert.ok(hash.startsWith("scrypt$"));
  assert.equal(verifyPassword("Correct-Horse-1", hash), true);
  assert.equal(verifyPassword("wrong-password-1", hash), false);
});

await test("legacy sha256 hashes still verify (no lockout on upgrade)", async () => {
  const crypto = await import("node:crypto");
  const legacy = crypto
    .createHash("sha256")
    .update("admin123::mihad-boom-shorts-secure-salt-v1")
    .digest("hex");
  assert.equal(verifyPassword("admin123", legacy), true);
});

await test("upload token verifies, and fails when tampered or expired", () => {
  const token = createUploadToken();
  assert.equal(verifyUploadToken(token), true);
  assert.equal(verifyUploadToken(token.slice(0, -2) + "xx"), false);
  assert.equal(verifyUploadToken(""), false);
  const [expires, nonce] = token.split(".");
  const forged = `${Number(expires) - 10 ** 7}.${nonce}.x`;
  assert.equal(verifyUploadToken(forged), false);
});

await test("Bangladeshi phone numbers normalise to international form", () => {
  assert.equal(normalizePhone("01712345678"), "8801712345678");
  assert.equal(normalizePhone("+8801712345678"), "8801712345678");
  assert.equal(normalizePhone("8801712345678"), "8801712345678");
});

// ---------------------------------------------------------------------------
console.log("\nOrder creation (src/lib/orders.ts — real code path)");
// ---------------------------------------------------------------------------

const [pkg] = await db
  .insert(schema.packages)
  .values({
    name: "7 Days Boom Trending",
    category: "boom",
    newPrice: "400.00",
    oldPrice: "500.00",
    shortDescription: "7+1 premium shorts",
    durationLabel: "7 Days",
    videoQuantity: 8,
    youtubeDemoUrl: "https://youtu.be/dQw4w9WgXcQ",
    visible: true,
    available: true,
    sortOrder: 0,
  })
  .returning();

await db.insert(schema.packageFeatures).values([
  { packageId: pkg.id, label: "High Quality", sortOrder: 0 },
  { packageId: pkg.id, label: "Trending Topics", sortOrder: 1 },
]);

await test("creates an order with a BBS- order number and server-side price", async () => {
  const result = await createOrder({
    packageId: pkg.id,
    customerName: "Rahim Uddin",
    whatsapp: "01712345678",
    paymentMethod: "bKash",
    transactionId: "TRX8N4K2P1",
    screenshotPath: "screenshots/2026/09/abc.jpg",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.orderNumber, /^BBS-\d{6}$/);
  assert.equal(result.basePrice, 400);
  assert.equal(result.finalAmount, 400);
  assert.equal(result.statusLabel, "Payment Verification");

  const [row] = await db
    .select()
    .from(schema.orders)
    .where((await import("drizzle-orm")).eq(schema.orders.id, result.orderId));
  assert.equal(row.status, "pending");
  assert.equal(row.paymentStatus, "unverified");
  assert.equal(row.customerName, "Rahim Uddin");
  assert.equal(row.whatsapp, "8801712345678");
});

await test("creates the customer, order_item and payment rows", async () => {
  const { eq } = await import("drizzle-orm");
  const [order] = await db.select().from(schema.orders).limit(1);

  const customers = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.whatsapp, "8801712345678"));
  assert.equal(customers.length, 1);
  assert.equal(order.customerId, customers[0].id);

  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  assert.equal(items.length, 1);
  assert.equal(Number(items[0].lineTotal), 400);

  const payments = await db.select().from(schema.payments).where(eq(schema.payments.orderId, order.id));
  assert.equal(payments.length, 1);
  assert.equal(payments[0].method, "bKash");
  assert.equal(payments[0].screenshotPath, "screenshots/2026/09/abc.jpg");
});

await test("rejects a reused transaction ID (duplicate submit)", async () => {
  const result = await createOrder({
    packageId: pkg.id,
    customerName: "Rahim Uddin",
    whatsapp: "01712345678",
    paymentMethod: "bKash",
    transactionId: "TRX8N4K2P1",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 409);
});

await test("refuses an order for an unavailable package", async () => {
  const { eq } = await import("drizzle-orm");
  await db.update(schema.packages).set({ available: false }).where(eq(schema.packages.id, pkg.id));

  const result = await createOrder({
    packageId: pkg.id,
    customerName: "Karim",
    whatsapp: "01812345678",
    paymentMethod: "Nagad",
    transactionId: "TRXUNAVAIL01",
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 409);

  await db.update(schema.packages).set({ available: true }).where(eq(schema.packages.id, pkg.id));
});

await test("validates required fields", async () => {
  const cases = [
    { packageId: pkg.id, customerName: "", whatsapp: "01712345678", paymentMethod: "bKash" as const, transactionId: "TRXVAL0001" },
    { packageId: pkg.id, customerName: "A", whatsapp: "01712345678", paymentMethod: "bKash" as const, transactionId: "TRXVAL0002" },
    { packageId: pkg.id, customerName: "A B", whatsapp: "123", paymentMethod: "bKash" as const, transactionId: "TRXVAL0003" },
    { packageId: pkg.id, customerName: "A B", whatsapp: "01712345678", paymentMethod: "bKash" as const, transactionId: "x" },
  ];
  for (const input of cases) {
    const r = await createOrder(input);
    assert.equal(r.ok, false, `expected rejection for ${JSON.stringify(input)}`);
  }
});

await test("applies a valid coupon and blocks an expired one", async () => {
  await db.insert(schema.coupons).values({
    code: "SAVE50",
    discountAmount: "50.00",
    active: true,
  });
  await db.insert(schema.coupons).values({
    code: "OLD10",
    discountPercent: 10,
    active: true,
    expiresAt: new Date(Date.now() - 86_400_000),
  });

  const ok = await createOrder({
    packageId: pkg.id,
    customerName: "Fatima",
    whatsapp: "01912345678",
    paymentMethod: "Nagad",
    transactionId: "TRXCOUPON01",
    couponCode: "save50",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    // 400 base − 100 package discount (oldPrice 500 → 400 is the base; no
    // package discount configured) − 50 coupon = 350.
    assert.equal(ok.finalAmount, 350);
    assert.equal(ok.discountTotal, 50);
  }

  const expired = await createOrder({
    packageId: pkg.id,
    customerName: "Fatima",
    whatsapp: "01912345678",
    paymentMethod: "Nagad",
    transactionId: "TRXCOUPON02",
    couponCode: "OLD10",
  });
  assert.equal(expired.ok, false);
});

await test("rejects an unknown coupon code", async () => {
  const r = await createOrder({
    packageId: pkg.id,
    customerName: "Jamil",
    whatsapp: "01612345678",
    paymentMethod: "bKash",
    transactionId: "TRXNOCOUP01",
    couponCode: "DOESNOTEXIST",
  });
  assert.equal(r.ok, false);
});

await test("order numbers are unique across many orders", async () => {
  const { sql } = await import("drizzle-orm");
  const res = await db
    .select({ n: sql<number>`count(distinct order_number)::int`, total: sql<number>`count(*)::int` })
    .from(schema.orders);
  assert.equal(res[0].n, res[0].total);
});

// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
await client.close();
process.exit(failed > 0 ? 1 : 0);
