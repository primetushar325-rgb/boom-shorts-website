/**
 * End-to-end functional test for the Boom Shorts site.
 *
 * It only talks to a *running* server over HTTP and needs an admin password.
 * Because it creates real rows (packages, coupons, orders, a banner, a review),
 * it refuses to run unless you opt in explicitly:
 *
 *   E2E_ALLOW_WRITES=1 E2E_BASE_URL=http://127.0.0.1:3000 node scripts/e2e.mjs
 *
 * Never point `E2E_BASE_URL` at production: use a local/preview database.
 * Rows it creates for the E2E package/coupon/order/banner/review are removed
 * again at the end of the run. The two test customers it registers are keyed by
 * fixed phone numbers (upserted), so repeat runs do not pile up rows.
 */
const BASE = process.env.E2E_BASE_URL || process.env.BASE || "http://127.0.0.1:3000";

if (process.env.E2E_ALLOW_WRITES !== "1") {
  console.error(
    "Refusing to run: this suite writes test data.\n" +
      "Start your server, then run it again with:\n\n" +
      `  E2E_ALLOW_WRITES=1 E2E_BASE_URL=${BASE} node scripts/e2e.mjs\n`,
  );
  process.exit(2);
}

let pass = 0;
let fail = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    pass += 1;
    console.log(`  ✅ ${name}`);
  } else {
    fail += 1;
    failures.push(`${name} ${detail}`);
    console.log(`  ❌ ${name} ${detail}`);
  }
}

function jar() {
  const cookies = new Map();
  return {
    header: () => [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    store: (res) => {
      const raw = res.headers.getSetCookie?.() ?? [];
      for (const cookie of raw) {
        const [pair] = cookie.split(";");
        const idx = pair.indexOf("=");
        const name = pair.slice(0, idx);
        const value = pair.slice(idx + 1);
        if (value === "") cookies.delete(name);
        else cookies.set(name, value);
      }
    },
  };
}

async function req(path, options = {}, session) {
  const headers = { ...(options.headers || {}) };
  if (session) headers.cookie = session.header();
  const res = await fetch(`${BASE}${path}`, { ...options, headers, redirect: "manual" });
  if (session) session.store(res);
  return res;
}

const json = async (res) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const imageBlob = (label) => {
  // tiny valid PNG
  const bytes = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  return new File([bytes], label, { type: "image/png" });
};

const admin = jar();
const customerA = jar();
const customerB = jar();

console.log("\n=== 1. Public pages ===");
for (const path of ["/", "/reviews", "/free", "/demo", "/orders", "/profile", "/admin/login"]) {
  const res = await req(path);
  check(`GET ${path} → 200`, res.status === 200, `(got ${res.status})`);
}

console.log("\n=== 2. Admin auth ===");
check("admin API without session → 401", (await req("/api/dashboard")).status === 401);
check("admin orders API without session → 401", (await req("/api/orders")).status === 401);
check("customer list without session → 401", (await req("/api/admin/customers")).status === 401);

let res = await req(
  "/api/auth/login",
  { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "wrong" }) },
  admin,
);
check("wrong admin password → 401", res.status === 401, `(got ${res.status})`);

res = await req(
  "/api/auth/login",
  { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "admin123" }) },
  admin,
);
check("correct admin password → 200", res.status === 200, `(got ${res.status})`);
check("admin session cookie set", admin.header().includes("mbs_admin_session="));
check("admin dashboard accessible", (await req("/api/dashboard", {}, admin)).status === 200);

console.log("\n=== 3. Package pricing (percentage + fixed) ===");
const pct = await json(
  await req(
    "/api/packages",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        category: "boom",
        name: "E2E Percent Pack",
        description: "20% off package",
        oldPrice: 1000,
        newPrice: 1000,
        discountType: "percent",
        discountValue: 20,
        features: "Feature one\nFeature two",
        quantityLabel: "10 videos",
        available: true,
        showOnHome: true,
      }),
    },
    admin,
  ),
);
let pkgA = pct.package;
check("percent package created", Boolean(pkgA?.id), JSON.stringify(pct).slice(0, 120));
check("percent 1000-20% → 800", String(pkgA?.newPrice) === "800.00", `(got ${pkgA?.newPrice})`);
check("original price kept at 1000", String(pkgA?.oldPrice) === "1000.00", `(got ${pkgA?.oldPrice})`);

const fixed = await json(
  await req(
    "/api/packages",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        category: "boom",
        name: "E2E Fixed Pack",
        description: "fixed discount",
        oldPrice: 1000,
        newPrice: 1000,
        discountType: "fixed",
        discountValue: 200,
      }),
    },
    admin,
  ),
);
const pkgB = fixed.package;
check("fixed 1000-200 → 800", String(pkgB?.newPrice) === "800.00", `(got ${pkgB?.newPrice})`);

const badDiscount = await json(
  await req(
    "/api/packages",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        category: "service",
        name: "E2E Over-discount Pack",
        oldPrice: 500,
        discountType: "fixed",
        discountValue: 900,
      }),
    },
    admin,
  ),
);
check(
  "discount can never push price below 0",
  String(badDiscount.package?.newPrice) === "0.00",
  `(got ${badDiscount.package?.newPrice})`,
);

console.log("\n=== 4. Package admin controls ===");
const patched = await json(
  await req(
    `/api/packages/${pkgA.id}`,
    { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ available: false, showOnHome: false, sortOrder: 7 }) },
    admin,
  ),
);
check("availability/visibility/sort updated", patched.package?.available === false && patched.package?.showOnHome === false && patched.package?.sortOrder === 7);

const repriced = await json(
  await req(
    `/api/packages/${pkgA.id}`,
    { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ oldPrice: 2000, discountType: "percent", discountValue: 25 }) },
    admin,
  ),
);
check("re-pricing stays consistent (2000-25% → 1500)", String(repriced.package?.newPrice) === "1500.00", `(got ${repriced.package?.newPrice})`);

await req(`/api/packages/${pkgA.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ available: true, showOnHome: true, oldPrice: 1000, discountType: "percent", discountValue: 20 }) }, admin);
await req(`/api/packages/${pkgB.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ available: true, showOnHome: true }) }, admin);

console.log("\n=== 5. Coupons ===");
const couponPercent = await json(
  await req(
    "/api/coupons",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "E2E10", discountType: "percent", discountValue: 10, minOrder: 100, usageLimit: 5, active: true }) },
    admin,
  ),
);
check("percent coupon created", Boolean(couponPercent.coupon?.id), JSON.stringify(couponPercent).slice(0, 120));

const couponFixed = await json(
  await req(
    "/api/coupons",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "E2EFIX", discountType: "fixed", discountValue: 150, minOrder: 0, active: true }) },
    admin,
  ),
);
check("fixed coupon created", Boolean(couponFixed.coupon?.id));

const couponExpired = await json(
  await req(
    "/api/coupons",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "E2EOLD", discountType: "percent", discountValue: 50, expiresAt: "2020-01-01T00:00:00.000Z", active: true }) },
    admin,
  ),
);
check("expired coupon created", Boolean(couponExpired.coupon?.id));

let couponCheck = await json(await req("/api/coupons/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "E2E10", amount: 800 }) }));
check("valid percent coupon → 80 off 800", couponCheck.valid === true && couponCheck.discount === 80, JSON.stringify(couponCheck));

couponCheck = await json(await req("/api/coupons/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "E2EFIX", amount: 800 }) }));
check("valid fixed coupon → 150 off", couponCheck.valid === true && couponCheck.discount === 150, JSON.stringify(couponCheck));

couponCheck = await json(await req("/api/coupons/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "E2E10", amount: 50 }) }));
check("minimum order rule enforced", couponCheck.valid === false, JSON.stringify(couponCheck));

couponCheck = await json(await req("/api/coupons/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "E2EOLD", amount: 800 }) }));
check("expired coupon rejected", couponCheck.valid === false && /expired/i.test(couponCheck.error || ""), JSON.stringify(couponCheck));

couponCheck = await json(await req("/api/coupons/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "NOSUCH", amount: 800 }) }));
check("unknown coupon rejected", couponCheck.valid === false);

console.log("\n=== 6. Order creation (server-side pricing + private screenshot) ===");
const form = new FormData();
form.append("packageId", String(pkgB.id));
form.append("quantity", "2");
form.append("customerName", "E2E Customer A");
form.append("whatsapp", "01711111111");
form.append("paymentNumber", "01711111111");
form.append("paymentMethod", "bKash");
form.append("transactionId", "TRXE2E0001");
form.append("couponCode", "E2E10");
form.append("pin", "4321");
form.append("screenshot", imageBlob("screen-a.png"));

res = await req("/api/orders", { method: "POST", body: form });
const created = await json(res);
check("order created (201)", res.status === 201, `(got ${res.status}) ${JSON.stringify(created).slice(0, 160)}`);
check("order has a unique order code", /^BS-[A-Z0-9]{6}$/.test(created.order?.orderCode || ""), created.order?.orderCode);
// package 800 x2 = 1600, coupon 10% = 160 → 1440
check("server-side total = 1440 (800×2 − 10%)", Number(created.order?.price) === 1440, `(got ${created.order?.price})`);
check("status starts pending", created.order?.status === "pending");
check("payment status starts pending", created.order?.paymentStatus === "pending");
const screenshotStored = created.order?.screenshotStored;

const duplicate = new FormData();
duplicate.append("packageId", String(pkgB.id));
duplicate.append("quantity", "2");
duplicate.append("customerName", "E2E Customer A");
duplicate.append("whatsapp", "01711111111");
duplicate.append("paymentMethod", "bKash");
duplicate.append("transactionId", "TRXE2E0001");
res = await req("/api/orders", { method: "POST", body: duplicate });
const dupBody = await json(res);
check("duplicate submit returns the same order", dupBody.duplicate === true && dupBody.order?.orderCode === created.order?.orderCode, JSON.stringify(dupBody).slice(0, 140));
check("duplicate submit does not create a second order", res.status === 200, `(got ${res.status})`);

const badOrder = new FormData();
badOrder.append("packageId", String(pkgB.id));
badOrder.append("customerName", "No Phone");
badOrder.append("whatsapp", "123");
badOrder.append("transactionId", "X1");
res = await req("/api/orders", { method: "POST", body: badOrder });
const badBody = await json(res);
check("invalid phone rejected with a friendly message", res.status === 400 && typeof badBody.error === "string" && !/error:|stack/i.test(badBody.error), badBody.error);

// second order for a different customer
const formB = new FormData();
formB.append("packageId", String(pkgB.id));
formB.append("quantity", "1");
formB.append("customerName", "E2E Customer B");
formB.append("whatsapp", "01822222222");
formB.append("paymentMethod", "Nagad");
formB.append("transactionId", "TRXE2E0002");
res = await req("/api/orders", { method: "POST", body: formB });
const createdB = await json(res);
check("second customer order created", res.status === 201, JSON.stringify(createdB).slice(0, 120));
check("second order total = 800", Number(createdB.order?.price) === 800, `(got ${createdB.order?.price})`);

console.log("\n=== 7. Customer isolation ===");
let login = await req("/api/customer/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "01711111111", pin: "4321" }) }, customerA);
check("customer A login with the PIN set at checkout", login.status === 200, `(got ${login.status})`);
login = await req("/api/customer/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone: "01711111111", pin: "0000" }) }, jar());
check("wrong PIN rejected", login.status === 401);

const ordersA = await json(await req("/api/customer/orders", {}, customerA));
check("customer A sees only their own orders", ordersA.orders?.length === 1 && ordersA.orders[0].transactionId === "TRXE2E0001", JSON.stringify(ordersA).slice(0, 140));
check("customer A order list leaks no screenshot reference", !JSON.stringify(ordersA).includes("local://") && !JSON.stringify(ordersA).includes("sb://"));

const anon = await req("/api/customer/orders");
check("anonymous order list → 401", anon.status === 401, `(got ${anon.status})`);

const trackOther = await json(await req("/api/customer/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderCode: createdB.order.orderCode, phone: "01711111111" }) }));
check("tracking someone else's order with your phone fails", !trackOther.order, JSON.stringify(trackOther).slice(0, 120));

const trackOwn = await json(await req("/api/customer/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderCode: createdB.order.orderCode, phone: "01822222222" }) }));
check("guest track with correct code + phone works", trackOwn.order?.orderCode === createdB.order.orderCode);

console.log("\n=== 8. Reviews ===");
let reviewSubmit = await req("/api/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rating: 5, packageName: "E2E Fixed Pack", message: "Great service, very fast delivery!" }) });
check("review without a session → 401", reviewSubmit.status === 401, `(got ${reviewSubmit.status})`);

const review = await json(await req("/api/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rating: 4, packageName: "E2E Fixed Pack", message: "Great service, very fast delivery!" }) }, customerA));
check("signed-in customer can submit a review", Boolean(review.review?.id), JSON.stringify(review).slice(0, 140));
check("new review is pending, not public", review.review?.status === "pending");

let publicReviews = await json(await req("/api/reviews"));
check("pending review is not public yet", !publicReviews.reviews?.some((item) => item.id === review.review.id));

const adminReviews = await json(await req("/api/reviews?status=pending", {}, admin));
check("admin sees pending reviews", adminReviews.reviews?.some((item) => item.id === review.review.id));

const approve = await json(await req(`/api/admin/reviews/${review.review.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "approved" }) }, admin));
check("admin can approve a review", approve.review?.status === "approved");

publicReviews = await json(await req("/api/reviews"));
check("approved review becomes public", publicReviews.reviews?.some((item) => item.id === review.review.id));
check("public review exposes no phone number", !JSON.stringify(publicReviews).includes("01711111111"));

const unauthorisedApprove = await req(`/api/admin/reviews/${review.review.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "rejected" }) });
check("customers cannot moderate reviews", unauthorisedApprove.status === 401, `(got ${unauthorisedApprove.status})`);

console.log("\n=== 9. Admin order + payment management ===");
const adminOrders = await json(await req(`/api/orders?q=TRXE2E0001`, {}, admin));
const adminOrder = adminOrders.orders?.[0];
check("admin can search orders", adminOrder?.transactionId === "TRXE2E0001");

const verify = await json(await req(`/api/orders/${adminOrder.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ paymentStatus: "verified" }) }, admin));
check("verifying payment moves status to payment_verified", verify.order?.paymentStatus === "verified" && verify.order?.status === "payment_verified", JSON.stringify(verify.order).slice(0, 120));

const processing = await json(await req(`/api/orders/${adminOrder.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "processing" }) }, admin));
check("status can be changed to processing", processing.order?.status === "processing");

const completed = await json(await req(`/api/orders/${adminOrder.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "completed" }) }, admin));
check("status can be changed to completed", completed.order?.status === "completed");

check("invalid status rejected", (await req(`/api/orders/${adminOrder.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "hacked" }) }, admin)).status === 400);

const customerOrderAfter = await json(await req("/api/customer/orders", {}, customerA));
check("customer sees the updated status", customerOrderAfter.orders?.[0]?.status === "completed", JSON.stringify(customerOrderAfter.orders?.[0] || {}).slice(0, 120));

console.log("\n=== 10. Payment screenshot privacy ===");
check("screenshot route requires admin", (await req(`/api/admin/screenshot/${adminOrder.id}`)).status === 401);
const shot = await req(`/api/admin/screenshot/${adminOrder.id}`, {}, admin);
const rawOrders = await json(await req("/api/orders", {}, admin));
const rawOrder = rawOrders.orders.find((order) => order.id === adminOrder.id);
const ref = rawOrder.screenshotUrl || "";

if (screenshotStored) {
  // Supabase Storage or the local development store is configured.
  check("admin screenshot route resolves a link", shot.status === 302 || shot.status === 200, `(got ${shot.status})`);
  check("stored screenshot value is a private reference (not a public URL)", /^local:\/\/|^sb:\/\//.test(ref), ref);
} else {
  // Production build without Supabase Storage: the upload is reported as not
  // stored instead of pretending it worked, and no fake reference is saved.
  check("upload failure is reported honestly to the customer", created.order?.screenshotStored === false);
  check("no screenshot reference is stored when upload is unavailable", ref === "", `(got "${ref}")`);
  check("admin screenshot route returns 404 when there is no screenshot", shot.status === 404, `(got ${shot.status})`);
}

console.log("\n=== 11. Banners / settings / misc ===");
const banner = await json(await req("/api/banners", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "E2E Banner", description: "test", buttonText: "Order Now", buttonUrl: "https://example.com", type: "offer", visible: true, sortOrder: 1 }) }, admin));
check("banner created with description + button", Boolean(banner.banner?.id) && banner.banner?.buttonText === "Order Now", JSON.stringify(banner).slice(0, 140));
check("banner requires admin", (await req("/api/banners", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "x" }) })).status === 401);

const settings = await json(await req("/api/settings"));
check("public settings never expose the password hash", !("adminPasswordHash" in (settings.settings || {})));
check("public settings include the featured video field", "youtubeVideoUrl" in (settings.settings || {}));

const updated = await json(await req("/api/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ siteName: "Boom Shorts", youtubeVideoUrl: "https://youtu.be/dQw4w9WgXcQ", youtubeTitle: "How we work" }) }, admin));
check("admin can update video settings", updated.settings?.youtubeVideoUrl?.includes("dQw4w9WgXcQ"), JSON.stringify(updated).slice(0, 120));
check("settings update requires admin", (await req("/api/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ siteName: "Hacked" }) })).status === 401);

const uploadNoAuth = await req("/api/upload", { method: "POST", body: (() => { const f = new FormData(); f.append("file", imageBlob("x.png")); return f; })() });
check("image upload requires admin", uploadNoAuth.status === 401, `(got ${uploadNoAuth.status})`);

console.log("\n=== 12. Homepage rendering ===");
await req(`/api/packages/${pkgB.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ bestSeller: true }) }, admin);
const home = await (await req("/")).text();
check("homepage renders package cards", home.includes("E2E Fixed Pack"));
check("homepage shows availability badge", home.includes("Available"));
check("homepage shows best seller badge styling", home.includes("Best Seller"));
check("homepage includes the featured video section (thumbnail + title)", home.includes("i.ytimg.com/vi/dQw4w9WgXcQ") && home.includes("How we work"));
check("footer + bottom navigation present", home.includes("Quick links"));
check("structured data present", home.includes("application/ld+json") && home.includes("PriceSpecification") === false && home.includes("\"Product\""));

const videoOff = await json(await req("/api/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ youtubeVideoUrl: "" }) }, admin));
void videoOff;
const homeNoVideo = await (await req("/")).text();
check("featured video section disappears when no URL is set", !homeNoVideo.includes("i.ytimg.com/vi/") && !homeNoVideo.includes("Play:"));

// ---------------------------------------------------------------------------
// Clean up the rows this run created (best effort, admin session required)
// ---------------------------------------------------------------------------
const cleanupTargets = [
  created.order?.id ? `/api/orders/${created.order.id}` : null,
  createdB.order?.id ? `/api/orders/${createdB.order.id}` : null,
  adminOrder?.id ? `/api/orders/${adminOrder.id}` : null,
  pkgA?.id ? `/api/packages/${pkgA.id}` : null,
  pkgB?.id ? `/api/packages/${pkgB.id}` : null,
  badDiscount.package?.id ? `/api/packages/${badDiscount.package.id}` : null,
  couponPercent.coupon?.id ? `/api/coupons/${couponPercent.coupon.id}` : null,
  couponFixed.coupon?.id ? `/api/coupons/${couponFixed.coupon.id}` : null,
  couponExpired.coupon?.id ? `/api/coupons/${couponExpired.coupon.id}` : null,
  banner.banner?.id ? `/api/banners/${banner.banner.id}` : null,
  review.review?.id ? `/api/admin/reviews/${review.review.id}` : null,
].filter((path) => typeof path === "string");

let cleaned = 0;
for (const path of cleanupTargets) {
  const res = await req(path, { method: "DELETE" }, admin);
  if (res.ok) cleaned += 1;
}
// restore what the run changed in settings
await req(
  "/api/settings",
  {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ youtubeVideoUrl: "" }),
  },
  admin,
);
console.log(`\n=== cleanup: removed ${cleaned}/${cleanupTargets.length} test rows ===`);

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
if (failures.length) {
  console.log("Failures:");
  for (const item of failures) console.log(` - ${item}`);
}
process.exit(fail === 0 ? 0 : 1);
