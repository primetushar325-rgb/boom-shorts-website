/**
 * Regression test for the production bug:
 *
 *   Homepage -> "Order Now" -> /checkout/[id] -> "⚠️ Something went wrong"
 *
 * ---------------------------------------------------------------------------
 * WHY THE ORDINARY ROUTE TEST MISSED IT
 * ---------------------------------------------------------------------------
 * `GET /checkout/3` returning 200 says nothing about what a phone sees. When a
 * customer taps "Order Now" the Next.js router does NOT load a document — it
 * asks for the route's RSC "flight" payload (`RSC: 1` + a router state tree).
 * If the Server Component throws, Next.js serializes that error into the flight
 * stream as `N:E{"digest":"…"}` and the client router raises the nearest error
 * boundary. With no boundary under `app/(site)`, that is the root
 * `src/app/error.tsx` — the "Something went wrong" screen from the report.
 *
 * So this suite treats a crash digest in the flight payload as a failure even
 * when the HTTP status is 200.
 *
 * ---------------------------------------------------------------------------
 * TWO THINGS THAT MAKE NAIVE ASSERTIONS LIE
 * ---------------------------------------------------------------------------
 * 1. Next.js embeds every boundary template (not-found, error) into the
 *    streamed HTML as an inert `<template>`, on healthy pages too. Matching
 *    their text in the raw HTML therefore proves nothing; `visibleText()` and
 *    the flight props are used instead.
 * 2. `notFound()` ALSO serializes as an `E{"digest":…}` row — specifically
 *    `NEXT_HTTP_ERROR_FALLBACK;404`. That is a correct not-found, not a crash,
 *    so it is excluded from the crash check.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT COVERS
 * ---------------------------------------------------------------------------
 *  1. every real package id (discovered from /api/packages, never hard-coded)
 *     renders the actual checkout form, on both navigation paths
 *  2. invalid / missing ids produce a real not-found — never a crash, never the
 *     outage fallback
 *  3. OPTIONAL, when scripts/db-fault-proxy.mjs is running: a stale pooled
 *     socket is absorbed by the retry, a full outage renders
 *     "Unable to load this package" + "Try again" + "Back to packages" with no
 *     crash digest, and a refresh after recovery returns the real checkout
 *
 * Read-only: it creates no rows, so it is safe to point at any environment.
 *
 *   node scripts/checkout-regression.mjs
 *   BASE_URL=https://boom-shorts-website.vercel.app node scripts/checkout-regression.mjs
 *   DB_FAULT_CONTROL_URL=http://127.0.0.1:6433 node scripts/checkout-regression.mjs
 */
const BASE = (process.env.BASE_URL || process.env.E2E_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/+$/,
  "",
);
const CONTROL = (process.env.DB_FAULT_CONTROL_URL || "").replace(/\/+$/, "");

let pass = 0;
let fail = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    pass += 1;
    console.log(`  ✅ ${name}`);
  } else {
    fail += 1;
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---------------------------------------------------------------------------
// Markers
// ---------------------------------------------------------------------------
const GENERIC_ERROR = "Something went wrong"; // src/app/error.tsx  <- the bug
const PACKAGE_NOT_FOUND = "Package not found"; // checkout/[id]/not-found.tsx
const OUTAGE_FALLBACK = "Unable to load this package"; // CheckoutLoadFailure
const TRY_AGAIN = "Try again";
const BACK_TO_PACKAGES = "Back to packages";
const REAL_FORM = "Confirm order"; // CheckoutForm submit button

/** Digests Next.js emits for a *legitimate* notFound(), not for a crash. */
const NOT_FOUND_DIGEST = /NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/;

/** True when the route deliberately called `notFound()`. */
const isFlightNotFound = (body) =>
  body.split("\n").some((line) => /^\w+:E\{/.test(line) && NOT_FOUND_DIGEST.test(line));

/**
 * True when a Server Component THREW. This is the exact condition that made the
 * client router render src/app/error.tsx on the phone.
 */
const hasFlightCrash = (body) =>
  body.split("\n").some((line) => /^\w+:E\{/.test(line) && !NOT_FOUND_DIGEST.test(line));

/**
 * Strip the inert boundary `<template>`s and inline flight `<script>`s so only
 * what the customer actually reads remains.
 */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

function routerStateTree(id) {
  return encodeURIComponent(
    JSON.stringify([
      "",
      {
        children: [
          "(site)",
          { children: ["checkout", { children: [String(id), { children: ["__PAGE__", {}] }] }] },
        ],
      },
    ]),
  );
}

async function htmlGet(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const body = await res.text();
  return { status: res.status, body, text: visibleText(body) };
}

/** The exact request the router makes for a client-side navigation. */
async function flightGet(path, id) {
  const res = await fetch(`${BASE}${path}?_rsc=r${Date.now()}`, {
    redirect: "manual",
    headers: {
      RSC: "1",
      "Next-Router-State-Tree": routerStateTree(id),
      "Next-Url": path,
      Accept: "text/x-component",
    },
  });
  return { status: res.status, body: await res.text() };
}

/**
 * CheckoutForm and CheckoutLoadFailure are client components, so their text is
 * not in the flight stream — their props are. `unitFinal` only ever goes to
 * CheckoutForm; `packageId` only ever goes to CheckoutLoadFailure.
 */
const flightShowsForm = (body) => body.includes('"unitFinal"') && !body.includes('"packageId"');
const flightShowsFallback = (body) => body.includes('"packageId"') && !body.includes('"unitFinal"');

const control = async (action) => {
  if (!CONTROL) return null;
  const res = await fetch(`${CONTROL}/${action}`, { method: "POST" });
  return res.json();
};

// ---------------------------------------------------------------------------
console.log(`\nCheckout regression suite`);
console.log(`  target : ${BASE}`);
console.log(`  faults : ${CONTROL || "not configured (static checks only)"}`);

const packagesResponse = await fetch(`${BASE}/api/packages`).then((r) => r.json());
const allPackages = Array.isArray(packagesResponse?.packages) ? packagesResponse.packages : [];
if (allPackages.length === 0) {
  console.error("  Could not read any packages from /api/packages — aborting.");
  process.exit(2);
}
console.log(`  packages discovered: ${allPackages.map((p) => p.id).join(", ")}\n`);

// ---------------------------------------------------------------------------
console.log("1. Order Now -> checkout renders for every real package");
for (const pkg of allPackages) {
  const path = `/checkout/${pkg.id}`;
  const html = await htmlGet(path);
  const flight = await flightGet(path, pkg.id);

  check(`${path} HTTP 200`, html.status === 200, `got ${html.status}`);
  check(`${path} renders the checkout form`, html.text.includes(REAL_FORM));
  check(`${path} shows the package name`, html.text.includes(String(pkg.name).slice(0, 18)));
  check(`${path} never shows the generic error`, !html.text.includes(GENERIC_ERROR));
  check(`${path} did not call notFound()`, !isFlightNotFound(flight.body));
  check(`${path} flight has NO crash digest`, !hasFlightCrash(flight.body), `status ${flight.status}`);
  check(`${path} flight delivers CheckoutForm`, flightShowsForm(flight.body));
}

// ---------------------------------------------------------------------------
console.log("\n2. Invalid / missing package ids get a real not-found state");
for (const bogus of [999999, "abc", 0, -1, "1.5", "3%20"]) {
  const path = `/checkout/${bogus}`;
  const html = await htmlGet(path);
  const flight = await flightGet(path, bogus);

  check(`${path} calls notFound()`, isFlightNotFound(flight.body));
  check(`${path} flight has NO crash digest`, !hasFlightCrash(flight.body));
  check(`${path} does not render the checkout form`, !flightShowsForm(flight.body));
  check(`${path} scoped "Package not found" boundary is wired`, html.body.includes(PACKAGE_NOT_FOUND));
  check(`${path} not mistaken for an outage`, !flightShowsFallback(flight.body));
  check(`${path} not the generic error`, !html.text.includes(GENERIC_ERROR));
}

// ---------------------------------------------------------------------------
if (!CONTROL) {
  console.log("\n3-5. Transient-failure scenarios SKIPPED");
  console.log("   Start the fault proxy and re-run to cover them:");
  console.log("     node scripts/db-fault-proxy.mjs");
  console.log("     DB_FAULT_CONTROL_URL=http://127.0.0.1:6433 node scripts/checkout-regression.mjs");
} else {
  const probeId = allPackages[0].id;
  const probePath = `/checkout/${probeId}`;

  console.log("\n3. Stale pooled connection (what a frozen serverless function hits)");
  await htmlGet(probePath); // make sure the app is holding a pooled socket
  console.log("   ", JSON.stringify(await control("stale")));
  {
    const html = await htmlGet(probePath);
    const flight = await flightGet(probePath, probeId);
    check(`${probePath} retry absorbs the dead socket`, html.text.includes(REAL_FORM), `status ${html.status}`);
    check(`${probePath} flight still delivers CheckoutForm`, flightShowsForm(flight.body));
    check(`${probePath} flight has NO crash digest`, !hasFlightCrash(flight.body));
  }

  console.log("\n4. Full database outage -> honest, retryable fallback");
  console.log("   ", JSON.stringify(await control("fail")));
  {
    const html = await htmlGet(probePath);
    const flight = await flightGet(probePath, probeId);
    check(`${probePath} responds 200, not 500`, html.status === 200, `got ${html.status}`);
    check(`${probePath} shows "${OUTAGE_FALLBACK}"`, html.text.includes(OUTAGE_FALLBACK));
    check(`${probePath} offers "${TRY_AGAIN}"`, html.text.includes(TRY_AGAIN));
    check(`${probePath} offers "${BACK_TO_PACKAGES}"`, html.text.includes(BACK_TO_PACKAGES));
    check(`${probePath} does NOT show "${GENERIC_ERROR}"`, !html.text.includes(GENERIC_ERROR));
    check(`${probePath} does not claim the package is gone`, !html.text.includes(PACKAGE_NOT_FOUND));
    check(
      `${probePath} flight carries NO crash digest`,
      !hasFlightCrash(flight.body),
      "this is the exact condition that raised error.tsx on the phone",
    );
    check(`${probePath} flight delivers the fallback component`, flightShowsFallback(flight.body));
  }

  console.log("\n5. Recovery -> 'Try again' (router.refresh) loads the real checkout");
  console.log("   ", JSON.stringify(await control("heal")));
  {
    const flight = await flightGet(probePath, probeId);
    check(`${probePath} refresh returns CheckoutForm`, flightShowsForm(flight.body));
    check(`${probePath} refresh has NO crash digest`, !hasFlightCrash(flight.body));
    const html = await htmlGet(probePath);
    check(`${probePath} reload returns the real form`, html.text.includes(REAL_FORM));
  }
}

// ---------------------------------------------------------------------------
console.log(`\n================ ${pass} passed, ${fail} failed ================`);
if (failures.length > 0) {
  console.log("FAILURES:");
  for (const f of failures) console.log("  - " + f);
  process.exit(1);
}
