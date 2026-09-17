/**
 * Integration tests: the REAL Next.js route handlers and the REAL server
 * components, driven against an in-process Postgres (PGlite).
 *
 * e2e.test.mts covers the service layer. This file goes one level up and calls
 * the actual exported HTTP handlers (`POST /api/orders`,
 * `POST /api/coupons/validate`) and the actual page components, so the
 * request-parsing, response shapes and data-loading paths are exercised too —
 * not just the functions underneath them.
 *
 * Note: admin-gated routes are NOT covered here because `cookies()` throws
 * outside a Next request scope. Those were verified over real HTTP instead
 * (unauthenticated GET /api/orders|dashboard|customers|payments → 401).
 *
 * Run with: npm run test:integration
 */
import assert from "node:assert/strict";
// `globalThis.AsyncLocalStorage` is installed by tests/setup-next-als.mts,
// which the npm script preloads with `tsx --import` so it runs before any
// hoisted next/dist import captures the (missing) global.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { NextRequest } from "next/server";
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
// Database: real migrations, then a realistic seed.
// ---------------------------------------------------------------------------
const client = new PGlite();
const db = drizzle(client, { schema });
(globalThis as { __boomShortsTestDb?: unknown }).__boomShortsTestDb = db;

const journal = JSON.parse(
  readFileSync(join(process.cwd(), "drizzle/meta/_journal.json"), "utf8"),
) as { entries: { tag: string }[] };
const files = readdirSync(join(process.cwd(), "drizzle")).filter((f) => f.endsWith(".sql"));

for (const entry of journal.entries) {
  const file = files.find((f) => f.startsWith(entry.tag));
  if (!file) throw new Error(`missing migration for ${entry.tag}`);
  for (const stmt of readFileSync(join(process.cwd(), "drizzle", file), "utf8").split(
    "--> statement-breakpoint",
  )) {
    const t = stmt.trim();
    if (t) await client.exec(t);
  }
}
console.log(`Applied ${journal.entries.length} migrations\n`);

// Import AFTER the seam exists so the modules bind to the test database.
const ordersRoute = await import("../src/app/api/orders/route");
const couponsRoute = await import("../src/app/api/coupons/validate/route");
const HomePage = (await import("../src/app/(site)/page")).default;
const PackageCard = (await import("../src/components/site/PackageCard")).default;
const CheckoutForm = (await import("../src/app/(site)/checkout/[packageId]/CheckoutForm")).default;
const CheckoutPage = (await import("../src/app/(site)/checkout/[packageId]/page")).default;
const ProfilePage = (await import("../src/app/(site)/profile/page")).default;

/**
 * Runs a page inside the minimum Next.js work store needed for `cookies()` to
 * work. `forceStatic` makes cookies() hand back an empty jar, i.e. a guest
 * visitor with no customer session — which is the realistic case here, since
 * nothing in the app writes customer_sessions yet.
 */
async function renderPage<T>(page: () => Promise<T>): Promise<T> {
  const { workAsyncStorage } = await import(
    "next/dist/server/app-render/work-async-storage.external"
  );
  const store = { forceStatic: true, route: "/test", dynamicShouldError: false };
  return (workAsyncStorage as { run: (s: unknown, fn: () => Promise<T>) => Promise<T> }).run(
    store,
    page,
  );
}

function post(url: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Flattens every string reachable in a React element tree so page output is
 * assertable without a DOM.
 *
 * Two things this has to get right:
 *  - Data often travels in *object props* (`<PackageCard pkg={…} />`,
 *    `<Testimonials items={…} />`), not in `children`, so object props are
 *    traversed too — otherwise the package names are invisible to the test.
 *  - Adjacent text nodes are concatenated with no separator, matching how
 *    React renders `Save {percentOff}%` to HTML ("Save 20%", not "Save | 20 | %").
 */
function collectText(node: unknown, out: string[] = [], seen = new Set<unknown>()): string[] {
  if (node === null || node === undefined || typeof node === "boolean") return out;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return out;
  }
  if (typeof node !== "object") return out;
  if (seen.has(node)) return out; // guard against cyclic structures
  seen.add(node);

  if (Array.isArray(node)) {
    for (const child of node) collectText(child, out, seen);
    return out;
  }

  if ("props" in node) {
    const props = (node as { props: Record<string, unknown> }).props;
    for (const [key, value] of Object.entries(props)) {
      // Skip function handlers and non-content props.
      if (typeof value === "function") continue;
      collectText(value, out, seen);
    }
    return out;
  }

  // Plain object (e.g. a data prop like `pkg` or a review row).
  for (const value of Object.values(node as Record<string, unknown>)) {
    collectText(value, out, seen);
  }
  return out;
}

/** Joined with no separator, mirroring rendered HTML text content. */
function textOf(tree: unknown): string {
  return collectText(tree).join("");
}

/**
 * Pulls the props a page passed to a given child component.
 *
 * Some assertions (the formatted ৳400 price, the "Available" badge) only exist
 * AFTER a child component renders, so a tree walk cannot see them. Extracting
 * the real props and rendering the real component keeps the test honest: it
 * exercises page -> props -> rendered HTML, with no re-implementation.
 */
function findProps(tree: unknown, component: unknown, seen = new Set<unknown>()): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  if (!tree || typeof tree !== "object" || seen.has(tree)) return out;
  seen.add(tree);
  if (Array.isArray(tree)) {
    for (const c of tree) out.push(...findProps(c, component, seen));
    return out;
  }
  const el = tree as { type?: unknown; props?: Record<string, unknown> };
  if ("type" in el && el.type === component && el.props) out.push(el.props);
  if (el.props) {
    for (const v of Object.values(el.props)) out.push(...findProps(v, component, seen));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
const [pkg] = await db
  .insert(schema.packages)
  .values({
    name: "7 Days Boom Trending",
    category: "boom",
    newPrice: "400.00",
    oldPrice: "500.00",
    shortDescription: "7+1 premium shorts",
    description: "A full week of ready-to-upload trending shorts.",
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
  { packageId: pkg.id, label: "Fast Delivery", sortOrder: 2 },
]);

await db.insert(schema.packages).values({
  name: "Hidden Package",
  newPrice: "100.00",
  visible: false,
  available: true,
  sortOrder: 9,
});
await db.insert(schema.packages).values({
  name: "Sold Out Package",
  newPrice: "200.00",
  visible: true,
  available: false,
  sortOrder: 8,
});

await db.insert(schema.coupons).values({ code: "SAVE50", discountAmount: "50.00", active: true });
await db.insert(schema.coupons).values({ code: "DEAD10", discountPercent: 10, active: false });

await db.insert(schema.testimonials).values([
  { name: "Rahim Uddin", message: "Fast delivery, great shorts.", rating: 5, approved: true, visible: true },
  { name: "Unapproved Person", message: "This should never render.", rating: 5, approved: false, visible: true },
  { name: "Hidden By Admin", message: "Approved but hidden by the admin.", rating: 5, approved: true, visible: false },
]);

// ---------------------------------------------------------------------------
console.log("POST /api/orders — real route handler");
// ---------------------------------------------------------------------------

let createdOrderNumber = "";

await test("accepts a valid order and returns 201 with an order number", async () => {
  const res = await ordersRoute.POST(
    post("/api/orders", {
      packageId: pkg.id,
      customerName: "Rahim Uddin",
      whatsapp: "01712345678",
      paymentMethod: "bKash",
      transactionId: "TRXINT0001",
      screenshotPath: "screenshots/2026/09/a.jpg",
    }),
  );
  assert.equal(res.status, 201);
  const data = (await res.json()) as { orderNumber: string; finalAmount: number };
  assert.match(data.orderNumber, /^BBS-\d{6}$/);
  assert.equal(data.finalAmount, 400);
  createdOrderNumber = data.orderNumber;
});

await test("ignores a client-supplied price — the server computes its own", async () => {
  const res = await ordersRoute.POST(
    post("/api/orders", {
      packageId: pkg.id,
      customerName: "Tamper Attempt",
      whatsapp: "01812345678",
      paymentMethod: "Nagad",
      transactionId: "TRXINT0002",
      price: 1, // attacker tries to set the price directly
      finalAmount: 1,
      basePrice: 1,
    }),
  );
  assert.equal(res.status, 201);
  const data = (await res.json()) as { finalAmount: number };
  assert.equal(data.finalAmount, 400, "client-supplied price must be ignored");
});

await test("rejects a duplicate transaction ID with 409", async () => {
  const res = await ordersRoute.POST(
    post("/api/orders", {
      packageId: pkg.id,
      customerName: "Rahim Uddin",
      whatsapp: "01712345678",
      paymentMethod: "bKash",
      transactionId: "TRXINT0001",
    }),
  );
  assert.equal(res.status, 409);
});

await test("returns 404 for an unknown package", async () => {
  const res = await ordersRoute.POST(
    post("/api/orders", {
      packageId: 999999,
      customerName: "Nobody",
      whatsapp: "01712345678",
      paymentMethod: "bKash",
      transactionId: "TRXINT0003",
    }),
  );
  assert.equal(res.status, 404);
});

await test("returns 400 with a message for missing fields", async () => {
  const res = await ordersRoute.POST(
    post("/api/orders", { packageId: pkg.id, customerName: "", whatsapp: "", paymentMethod: "bKash", transactionId: "" }),
  );
  assert.equal(res.status, 400);
  const data = (await res.json()) as { error: string };
  assert.ok(data.error.length > 0);
});

// ---------------------------------------------------------------------------
console.log("\nPOST /api/coupons/validate — real route handler");
// ---------------------------------------------------------------------------

await test("validates an active coupon and reports the discount", async () => {
  const res = await couponsRoute.POST(post("/api/coupons/validate", { code: "save50", amount: 400 }));
  assert.equal(res.status, 200);
  const data = (await res.json()) as { valid: boolean; discount: number; note: string };
  assert.equal(data.valid, true);
  assert.equal(data.discount, 50);
  assert.ok(data.note.includes("50"));
});

await test("rejects a disabled coupon", async () => {
  const res = await couponsRoute.POST(post("/api/coupons/validate", { code: "DEAD10", amount: 400 }));
  const data = (await res.json()) as { valid: boolean; error: string };
  assert.equal(data.valid, false);
  assert.ok(data.error.length > 0);
});

await test("rejects an unknown coupon without leaking which codes exist", async () => {
  const res = await couponsRoute.POST(post("/api/coupons/validate", { code: "NOPE123", amount: 400 }));
  const data = (await res.json()) as { valid: boolean };
  assert.equal(data.valid, false);
});

await test("enforces the minimum order amount", async () => {
  await db.insert(schema.coupons).values({
    code: "BIG100",
    discountAmount: "100.00",
    minOrderAmount: "1000.00",
    active: true,
  });
  const res = await couponsRoute.POST(post("/api/coupons/validate", { code: "BIG100", amount: 400 }));
  const data = (await res.json()) as { valid: boolean; error: string };
  assert.equal(data.valid, false);
  assert.ok(/minimum/i.test(data.error));
});

// ---------------------------------------------------------------------------
console.log("\nServer components — real page rendering against the database");
// ---------------------------------------------------------------------------

await test("homepage passes real package data down to the cards", async () => {
  const tree = await HomePage();
  const cards = findProps(tree, PackageCard);

  assert.ok(cards.length >= 2, `expected visible packages, got ${cards.length} cards`);
  const text = textOf(cards);
  assert.ok(text.includes("7 Days Boom Trending"), "visible package missing from card props");
  assert.ok(text.includes("Sold Out Package"), "unavailable package should still be listed");
  assert.ok(text.includes("High Quality"), "package features missing from card props");
});

await test("PackageCard renders the formatted price, badge and CTA", async () => {
  const tree = await HomePage();
  const [card] = findProps(tree, PackageCard).filter((c) => c.pkg);
  const html = renderToStaticMarkup(createElement(PackageCard, card as never));

  assert.ok(html.includes("৳400"), "formatted price missing");
  assert.ok(html.includes("৳500"), "strikethrough price missing");
  assert.ok(html.includes("Available"), "availability badge missing");
  assert.ok(html.includes("High Quality"), "feature tick missing");
  assert.ok(html.includes("Order Now"), "CTA missing");
  assert.ok(html.includes("/checkout/"), "CTA must link to checkout");
});

await test("homepage hides packages with visible=false", async () => {
  const text = textOf(await HomePage());
  assert.ok(!text.includes("Hidden Package"), "visible=false package leaked onto the homepage");
});

await test("homepage only renders admin-approved reviews", async () => {
  const text = textOf(await HomePage());
  assert.ok(text.includes("Rahim Uddin"), "approved review missing");
  assert.ok(!text.includes("Unapproved Person"), "unapproved review leaked onto the homepage");
});

await test("checkout renders the package, its price and the YouTube demo", async () => {
  const tree = await CheckoutPage({ params: Promise.resolve({ packageId: String(pkg.id) }) });
  const text = textOf(tree);

  assert.ok(text.includes("7 Days Boom Trending"), "package name missing");
  assert.ok(text.includes("৳400"), "final price missing");
  assert.ok(text.includes("৳500"), "strikethrough price missing");
  assert.ok(text.includes("Save 20%"), "discount pill missing");
  assert.ok(text.includes("dQw4w9WgXcQ"), "YouTube video id not embedded");
  // The bKash/Nagad labels are static UI inside CheckoutForm (a client
  // component using useRouter, so it cannot render outside router context).
  // What the page is responsible for is handing it the configured numbers.
  const forms = findProps(tree, CheckoutForm);
  assert.equal(forms.length, 1, "checkout form not rendered");
  const settings = forms[0].settings as Record<string, string>;
  assert.ok(settings.bkashNumber, "bKash number not passed to the payment form");
  assert.ok(settings.nagadNumber !== undefined, "Nagad number not passed to the payment form");
  assert.equal((forms[0].pkg as { finalPrice: number }).finalPrice, 400, "wrong price handed to the form");
});

await test("checkout blocks ordering an unavailable package", async () => {
  const [unavailable] = await db
    .select()
    .from(schema.packages)
    .where((await import("drizzle-orm")).eq(schema.packages.name, "Sold Out Package"));

  const tree = await CheckoutPage({ params: Promise.resolve({ packageId: String(unavailable.id) }) });
  const text = textOf(tree);

  assert.ok(/currently unavailable/i.test(text), "unavailable notice missing");
  assert.ok(!text.includes("Confirm Order"), "order form must not render for an unavailable package");
});

await test("the order created over HTTP is readable by order number", async () => {
  const { eq } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.orderNumber, createdOrderNumber));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "pending");
  assert.equal(Number(rows[0].finalAmount), 400);
});

// ---------------------------------------------------------------------------
console.log("\n/profile — the bottom-nav tab that used to 404");
// ---------------------------------------------------------------------------

await test("profile shows the customer and their order summary", async () => {
  const tree = await renderPage(() => ProfilePage({ searchParams: Promise.resolve({ phone: "8801712345678" }) }));
  const text = textOf(tree);
  assert.ok(text.includes("Rahim Uddin"), `expected the customer name, got: ${text.slice(0, 200)}`);
  assert.ok(text.includes("8801712345678"), "expected the WhatsApp number");
  assert.ok(text.includes("My Profile"), "expected the page heading");
  assert.ok(text.includes("Total Orders"), "expected the stats tiles");
  assert.ok(text.includes("Recent Orders"), "expected the recent orders section");
});

await test("profile totals match the orders actually placed", async () => {
  const tree = await renderPage(() => ProfilePage({ searchParams: Promise.resolve({ phone: "8801712345678" }) }));
  const rows = await client.query<{ n: string }>(
    `select count(*)::text as n from orders where whatsapp = '8801712345678'`,
  );
  const count = Number(rows.rows[0].n);
  assert.ok(count > 0, "expected the seed to have created orders");
  // The "Total Orders" tile renders the count; it must not be a hardcoded 1.
  assert.ok(textOf(tree).includes(String(count)), `expected ${count} orders shown`);
});

await test("profile renders a helpful empty state for an unknown number", async () => {
  const tree = await renderPage(() => ProfilePage({ searchParams: Promise.resolve({ phone: "8801999999999" }) }));
  const text = textOf(tree);
  assert.ok(text.includes("No profile found for that number"), `got: ${text.slice(0, 200)}`);
  assert.ok(!text.includes("Rahim Uddin"), "must not leak another customer's name");
});

await test("profile with no lookup shows the lookup form, not an error", async () => {
  const tree = await renderPage(() => ProfilePage({ searchParams: Promise.resolve({}) }));
  const text = textOf(tree);
  assert.ok(text.includes("Look up your profile"), `got: ${text.slice(0, 200)}`);
  assert.ok(text.includes("never ask for a password"), "expected the no-password reassurance");
});

// ---------------------------------------------------------------------------
console.log("\ndrizzle/rls-policies.sql — applies cleanly to real Postgres");
// ---------------------------------------------------------------------------

/**
 * Strips `--` comment lines BEFORE splitting into statements.
 *
 * Doing it the other way round (split, then drop chunks starting with `--`)
 * silently discards any statement that follows a comment block in the same
 * chunk — which is exactly how `ALTER TABLE settings ENABLE ROW LEVEL SECURITY`
 * went missing on the first run of this check.
 */
function splitSql(sql: string): string[] {
  const withoutComments = sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
  return withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

await test("every statement in the RLS file executes", async () => {
  // Supabase provisions these two roles on every project; PGlite does not.
  // Creating them here lets the policy SQL itself be validated. On a real
  // Supabase project this CREATE ROLE is unnecessary (and would be a no-op
  // conflict), which is why it lives in the test and not in the SQL file.
  await client.exec(`DO $$ BEGIN
    CREATE ROLE anon NOLOGIN;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  await client.exec(`DO $$ BEGIN
    CREATE ROLE authenticated NOLOGIN;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

  const { readFileSync: rf } = await import("node:fs");
  const sql = rf(join(process.cwd(), "drizzle/rls-policies.sql"), "utf8");
  const statements = splitSql(sql);
  assert.ok(statements.length > 30, `expected many statements, got ${statements.length}`);

  const failures: string[] = [];
  for (const stmt of statements) {
    try {
      await client.exec(stmt);
    } catch (err) {
      failures.push(`${stmt.slice(0, 60).replace(/\s+/g, " ")} -> ${String((err as Error).message).slice(0, 90)}`);
    }
  }
  assert.deepEqual(failures, [], `RLS statements failed:\n      ${failures.join("\n      ")}`);
});

await test("RLS is enabled on all 19 tables — including settings", async () => {
  const res = await client.query<{ relname: string; relrowsecurity: boolean }>(
    `select relname, relrowsecurity from pg_class
      where relkind = 'r' and relnamespace = 'public'::regnamespace order by relname`,
  );
  const off = res.rows.filter((r) => !r.relrowsecurity).map((r) => r.relname);
  assert.deepEqual(off, [], `RLS missing on: ${off.join(", ")}`);
  assert.equal(res.rows.length, 19);
});

await test("the 13 expected policies exist", async () => {
  const res = await client.query<{ policyname: string }>(
    `select policyname from pg_policies where schemaname = 'public' order by 1`,
  );
  const names = res.rows.map((r) => r.policyname);
  for (const expected of [
    "public read packages",
    "public read approved reviews",
    "customer reads own orders",
    "customer reads own order items",
    "customer reads own profile",
  ]) {
    assert.ok(names.includes(expected), `missing policy: ${expected}`);
  }
  assert.equal(names.length, 13);
});

await test("sensitive tables get no permissive policy (deny by default)", async () => {
  const res = await client.query<{ tablename: string }>(
    `select distinct tablename from pg_policies where schemaname = 'public'`,
  );
  const withPolicies = new Set(res.rows.map((r) => r.tablename));
  for (const sensitive of ["settings", "payments", "admin_users", "admin_sessions", "coupons"]) {
    assert.ok(!withPolicies.has(sensitive), `${sensitive} must have no policy (deny by default)`);
  }
});

// ---------------------------------------------------------------------------
console.log("\n/reviews — the bottom-nav Reviews destination");
// ---------------------------------------------------------------------------

await test("reviews page shows only approved AND visible reviews", async () => {
  const ReviewsPage = (await import("../src/app/(site)/reviews/page")).default;
  const tree = await renderPage(() => ReviewsPage());
  const text = textOf(tree);

  assert.ok(text.includes("Rahim Uddin"), "the approved, visible review must render");
  assert.ok(!text.includes("Unapproved Person"), "unapproved reviews must never render");
  assert.ok(!text.includes("Hidden By Admin"), "admin-hidden reviews must never render");
  assert.ok(!text.includes("This should never render"), "unapproved text leaked");
});

await test("reviews page computes its average from the rows it actually shows", async () => {
  const ReviewsPage = (await import("../src/app/(site)/reviews/page")).default;
  const tree = await renderPage(() => ReviewsPage());
  const text = textOf(tree);

  const res = await client.query<{ n: string; avg: string }>(
    `select count(*)::text as n, coalesce(round(avg(rating),1),0)::text as avg
       from testimonials where approved and visible`,
  );
  const expectedCount = Number(res.rows[0].n);
  assert.ok(expectedCount > 0, "expected at least one visible review");
  assert.ok(text.includes(String(expectedCount)), `expected the count ${expectedCount} to render`);
  assert.ok(text.includes(res.rows[0].avg), `expected the average ${res.rows[0].avg} to render`);
});

await test("the bottom nav points at four real destinations", async () => {
  const { readFileSync: rf } = await import("node:fs");
  const nav = rf(join(process.cwd(), "src/components/site/BottomNav.tsx"), "utf8");
  for (const href of ['"/"', '"/orders"', '"/reviews"', '"/profile"']) {
    assert.ok(nav.includes(href), `bottom nav missing ${href}`);
  }
  // Every destination must be a real route, not a dead link.
  for (const dir of ["reviews", "orders", "profile"]) {
    const ok = readdirSync(join(process.cwd(), "src/app/(site)", dir)).includes("page.tsx");
    assert.ok(ok, `src/app/(site)/${dir}/page.tsx must exist`);
  }
});

// ---------------------------------------------------------------------------
console.log("\nPATCH /api/settings — admin auth + no mass assignment");
// ---------------------------------------------------------------------------

await test("unauthenticated PATCH /api/settings is rejected", async () => {
  const settingsRoute = await import("../src/app/api/settings/route");
  const req = new NextRequest("http://localhost:3000/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ siteName: "Hijacked", adminPasswordHash: "attacker" }),
  });
  const res = await renderPage(() => settingsRoute.PATCH(req));
  assert.equal(res.status, 401, `expected 401, got ${res.status}`);
});

await test("the settings allowlist drops columns that must never be set", async () => {
  const { buildPatch } = await import("../src/lib/adminCrud");
  const src = await import("node:fs");
  const route = src
    .readFileSync(join(process.cwd(), "src/app/api/settings/route.ts"), "utf8")
    .split("const SPEC: FieldSpec = {")[1]
    .split("};")[0];
  const allowed = new Set([...route.matchAll(/^\s*([a-zA-Z]+):/gm)].map((m) => m[1]));

  // Every settings column the admin may legitimately edit must be allowlisted,
  // and the sensitive/derived ones must not be.
  for (const forbidden of ["id", "adminPasswordHash", "totalVisitors", "updatedAt"]) {
    assert.ok(!allowed.has(forbidden), `${forbidden} must not be in the allowlist`);
  }
  for (const expected of ["siteName", "whatsappNumber", "bkashNumber", "offerEndsAt"]) {
    assert.ok(allowed.has(expected), `${expected} should be editable`);
  }

  const patch = buildPatch(
    { siteName: "Boom Shorts", adminPasswordHash: "x", id: 99, evil: "y" },
    { siteName: (v) => String(v) },
  );
  assert.deepEqual(Object.keys(patch), ["siteName"], "only allowlisted keys survive");
});

// ---------------------------------------------------------------------------
console.log("\nSiteHelp — the site-wide WhatsApp button");
// ---------------------------------------------------------------------------

await test("the floating help button is rendered from the layout with the settings number", async () => {
  const SiteHelp = (await import("../src/components/site/SiteHelp")).default;
  const WhatsAppButton = (await import("../src/components/site/WhatsAppButton")).default;

  const tree = await renderPage(() => SiteHelp());
  const props = findProps(tree, WhatsAppButton);
  assert.equal(props.length, 1, "expected exactly one WhatsAppButton — no duplicate");

  const rows = await client.query<{ whatsapp_number: string }>(
    `select whatsapp_number from settings where id = 1`,
  );
  assert.ok(rows.rows[0], "settings row must exist");
  assert.equal(
    props[0].whatsappNumber,
    rows.rows[0].whatsapp_number,
    "the number must come from settings, not be hard-coded",
  );
  assert.ok(String(props[0].whatsappNumber).length > 5, "number must not be empty");
});

// ---------------------------------------------------------------------------
console.log("\n/order/[orderNumber] — the success/status page for a real order");
// ---------------------------------------------------------------------------

await test("the order page shows the id, amount, status and a WhatsApp link", async () => {
  assert.ok(createdOrderNumber, "an order must have been created earlier in this suite");

  const OrderPage = (await import("../src/app/(site)/order/[orderNumber]/page")).default;
  const tree = await renderPage(() =>
    OrderPage({ params: Promise.resolve({ orderNumber: createdOrderNumber }) }),
  );
  const text = textOf(tree);

  const rows = await client.query<{
    package_name: string;
    final_amount: string | null;
    price: string | null;
    status: string;
  }>(`select package_name, final_amount, price, status from orders where order_number = $1`, [
    createdOrderNumber,
  ]);
  const row = rows.rows[0];
  assert.ok(row, "the order must exist in the database");

  assert.ok(text.includes("ORDER RECEIVED"), "expected the success headline");
  assert.ok(text.includes(createdOrderNumber), "expected the order number to render");
  assert.ok(text.includes(row.package_name), "expected the package name to render");

  const { taka } = await import("../src/lib/pricing");
  assert.ok(
    text.includes(taka(row.final_amount ?? row.price)),
    "expected the final amount, computed from the database row",
  );

  const { ORDER_STATUS_LABELS } = await import("../src/lib/orders");
  const label =
    ORDER_STATUS_LABELS[row.status as keyof typeof ORDER_STATUS_LABELS] ?? ORDER_STATUS_LABELS.pending;
  assert.ok(text.includes(label), `expected the status label "${label}"`);

  // The WhatsApp hand-off must use the settings number, not a hardcoded one.
  const settingsRow = (
    await client.query<{ whatsapp_number: string }>(`select whatsapp_number from settings where id = 1`)
  ).rows[0];
  const linkProps = findProps(tree, "a" as unknown);
  const hrefs = linkProps.map((pr) => String(pr.href ?? ""));
  assert.ok(
    hrefs.some((h) => h.startsWith("https://wa.me/")),
    "expected a click-to-chat wa.me link",
  );
  assert.ok(
    hrefs.some((h) => h.includes(settingsRow.whatsapp_number.replace(/[^\d]/g, ""))),
    "the wa.me link must use the number from settings",
  );
});

// ---------------------------------------------------------------------------
console.log("\nnot-found handling for unknown orders and packages");
// ---------------------------------------------------------------------------

/**
 * Next signals `notFound()` by throwing a tagged error rather than returning.
 * The digest is "NEXT_HTTP_ERROR_FALLBACK;404" — asserting on it proves the
 * route really calls notFound() (and so renders the branded not-found page)
 * instead of silently rendering an empty shell.
 */
function isNotFound(err: unknown): boolean {
  const digest = String((err as { digest?: unknown })?.digest ?? "");
  return digest.includes("NEXT_HTTP_ERROR_FALLBACK;404");
}
// ---------------------------------------------------------------------------

await test("an unknown order number triggers Next's notFound()", async () => {
  const OrderPage = (await import("../src/app/(site)/order/[orderNumber]/page")).default;
  await assert.rejects(
    () => renderPage(() => OrderPage({ params: Promise.resolve({ orderNumber: "BBS-000000" }) })),
    isNotFound,
    "expected a notFound() signal",
  );
});

await test("an unknown checkout package triggers Next's notFound()", async () => {
  const CheckoutPage = (await import("../src/app/(site)/checkout/[packageId]/page")).default;
  await assert.rejects(
    () => renderPage(() => CheckoutPage({ params: Promise.resolve({ packageId: "999999" }) })),
    isNotFound,
    "expected a notFound() signal",
  );
});

// ---------------------------------------------------------------------------
console.log("\nWhatsApp — free click-to-chat only, no paid API");
// ---------------------------------------------------------------------------

await test("no WhatsApp Cloud API or paid messaging service exists in the code", async () => {
  const { readFileSync: rf } = await import("node:fs");
  const srcDir = join(process.cwd(), "src");

  const files: string[] = [];
  (function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
    }
  })(srcDir);

  const banned = [
    "graph.facebook.com",
    "WHATSAPP_CLOUD_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "sendWhatsAppText",
    "whatsappCloudConfigured",
    "api.whatsapp.com",
    "twilio",
  ];
  const found: string[] = [];
  for (const f of files) {
    const code = rf(f, "utf8");
    for (const b of banned) if (code.includes(b)) found.push(`${f.replace(srcDir, "src")}: ${b}`);
  }
  assert.deepEqual(found, [], `paid WhatsApp API references found:\n      ${found.join("\n      ")}`);
});

await test("the order page WhatsApp link carries the full order details", async () => {
  const OrderPage = (await import("../src/app/(site)/order/[orderNumber]/page")).default;
  const tree = await renderPage(() =>
    OrderPage({ params: Promise.resolve({ orderNumber: createdOrderNumber }) }),
  );

  const settingsRow = (
    await client.query<{ whatsapp_number: string }>(`select whatsapp_number from settings where id = 1`)
  ).rows[0];

  const hrefs = findProps(tree, "a" as unknown)
    .map((pr) => String(pr.href ?? ""))
    .filter((h) => h.startsWith("https://wa.me/"));
  assert.ok(hrefs.length > 0, "expected a wa.me click-to-chat link");

  const link = decodeURIComponent(hrefs[0]);
  const business = settingsRow.whatsapp_number.replace(/[^\d]/g, "");
  assert.ok(link.includes(business), "the link must be addressed to the business number from settings");

  for (const expected of ["Order ID", "Package", "Amount", "Payment", "Transaction ID", "Status"]) {
    assert.ok(link.includes(expected), `the prefilled message must contain "${expected}"`);
  }
  assert.ok(link.includes(createdOrderNumber), "the message must contain the order number");
});

// ---------------------------------------------------------------------------
console.log("\nmass assignment — no admin route spreads the raw body");
// ---------------------------------------------------------------------------

await test("every admin PATCH route uses an allowlist, never { ...body }", async () => {
  const { readFileSync: rf } = await import("node:fs");
  const apiDir = join(process.cwd(), "src/app/api");

  const routeFiles: string[] = [];
  for (const group of readdirSync(apiDir)) {
    const groupPath = join(apiDir, group);
    const direct = join(groupPath, "route.ts");
    if (readdirSync(apiDir).includes(group) && existsSync(direct)) routeFiles.push(direct);
    for (const sub of readdirSync(groupPath)) {
      const nested = join(groupPath, sub, "route.ts");
      if (existsSync(nested)) routeFiles.push(nested);
    }
  }
  assert.ok(routeFiles.length > 20, `expected to scan many routes, found ${routeFiles.length}`);

  // A spread of the request body straight into a patch/values object lets a
  // client write any column. It must not appear in executable code.
  const offenders: string[] = [];
  for (const file of routeFiles) {
    const src = rf(file, "utf8");
    // Strip block and line comments so the explanatory notes don't count.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    if (/\.\.\.(body|data|input)\b/.test(code)) offenders.push(file.replace(apiDir, "api"));
  }
  assert.deepEqual(offenders, [], `raw body spread found in: ${offenders.join(", ")}`);
});

await test("content-route allowlists exclude id and createdAt", async () => {
  const { readFileSync: rf } = await import("node:fs");
  const routes = [
    "banners", "coupons", "faqs", "free-video-cards",
    "gallery", "notices", "proof-slides", "sections", "testimonials",
  ];
  for (const r of routes) {
    const src = rf(
      join(process.cwd(), `src/app/api/${r}/[id]/route.ts`),
      "utf8",
    );
    assert.ok(src.includes("const SPEC: FieldSpec"), `${r} must declare a SPEC allowlist`);
    const spec = src.split("const SPEC: FieldSpec = {")[1].split("};")[0];
    const keys = [...spec.matchAll(/^\s*([a-zA-Z]+):/gm)].map((m) => m[1]);
    assert.ok(keys.length > 0, `${r} allowlist must not be empty`);
    for (const forbidden of ["id", "createdAt"]) {
      assert.ok(!keys.includes(forbidden), `${r} must not allowlist ${forbidden}`);
    }
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
await client.close();
process.exit(failed > 0 ? 1 : 0);
