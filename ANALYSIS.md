# Boom Shorts Website — Full Codebase Analysis

> Branch: `arena/01a0b08e-boom-shorts-website` · Base commit: `4a64128` ("Fix: Free Videos button links to external site")
> Puro repo ekta single commit — kono history nei.

---

## 1. Project Overview

**Ki jinish:** "Mihad Boom Shorts" — ekta YouTube Shorts / voice-over / thumbnail / SEO service
bechar **e-commerce landing site + full admin panel**. Bangladesh market (bKash/Nagad/Rocket
payment, WhatsApp order confirmation, ৳ pricing).

**Architecture:** Classic Next.js App Router monolith. Server Components DB theke data pore
directly render kore, client components interactivity handle kore, admin panel ekta separate
`/admin` route group ja API routes er maddhome CRUD kore.

### Stack (verified from `package.json`)

| Layer | Tech | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.6 |
| UI | React | 19.2.6 |
| Language | TypeScript (`strict: true`) | 5.9.3 |
| CSS | Tailwind CSS v4 via `@tailwindcss/postcss` | 4.1.17 |
| Animation | framer-motion | ^12.42.2 |
| ORM | Drizzle ORM + `node-postgres` | 0.45.2 |
| DB | PostgreSQL (Supabase, ap-northeast-2) | — |
| File storage | `@vercel/blob` | ^0.27.1 |
| Icons | lucide-react | ^1.25.0 (**unused**) |
| Env | dotenv | 17.3.1 (**unused in code**) |

### Size

```
6,409 lines of TS/TSX/CSS/JS/HTML (excluding package-lock.json & drizzle snapshots)
121 source files
```

---

## 2. Directory Map

```
boom-shorts-website/
├── drizzle.config.json          ⚠️  LIVE DB credentials committed here
├── drizzle/                     2 migrations (0000_special_donald_blake, 0001_goofy_chameleon)
├── next.config.ts               only: images.unoptimized = true
├── package.json
├── tsconfig.json                strict, @/* -> ./src/*
├── eslint.config.mjs            next/core-web-vitals flat config
├── public/
│   ├── logo.png (656 KB), icons/, manifest.json (PWA)
│   ├── proof/1..19.{jpg,png}    19 client-review screenshots (~1.5 MB)
│   ├── Image                    ⚠️  1-byte stray file
│   └── website/                 ⚠️  DEAD legacy static site (index.html, demo.html,
│                                    order.html, style.css, script.js, README.md)
│                                    publicly served at /website/index.html
└── src/
    ├── middleware.ts            cookie-presence gate on /admin/*
    ├── db/
    │   ├── schema.ts            12 tables (243 lines)
    │   └── index.ts             pg Pool, ssl.rejectUnauthorized = false
    ├── lib/
    │   ├── auth.ts              SHA-256 + hardcoded salt, timingSafeEqual
    │   ├── requireAdmin.ts      isAdminAuthed()
    │   ├── settings.ts          singleton settings row (id=1), auto-seed
    │   ├── constants.ts         ADMIN_COOKIE name
    │   ├── format.ts            taka(), discountPercent(), WhatsApp link builders
    │   └── proofSeed.ts         seeds 19 proof slides if table empty
    ├── app/
    │   ├── layout.tsx / page.tsx / globals.css
    │   ├── demo/  free/  payment/[id]/
    │   ├── admin/login/  +  admin/(dashboard)/ × 13 pages
    │   └── api/                 31 route files (16 resources × collection+item)
    └── components/              20 components (site + admin/ui + admin/AdminSidebar)
```

---

## 3. Data Model (12 tables, `src/db/schema.ts`)

| Table | Purpose | Notes |
|---|---|---|
| `settings` | Singleton (id=1) — 40+ columns: branding, hero copy, socials, payment numbers, offer, **adminPasswordHash**, totalVisitors | Auto-created with default password |
| `packages` | Boom Shorts + Services cards | `category`: `boom` \| `service` |
| `orders` | Customer orders | `price` numeric(10,2), `status`: pending/confirmed/completed/rejected |
| `sections` | Unlimited custom sections | `items` is untyped `jsonb` |
| `banners` | Offer banners | `type`: banner \| offer |
| `notices` | Marquee notice board | |
| `testimonials` | Reviews | |
| `faqs` | FAQ accordion | |
| `gallery` | Work gallery | |
| `proof_slides` | Client-review marquee | Seeded from `/public/proof/*` |
| `free_video_cards` | Cards for `/free` page | ⚠️ orphaned — see §6 |
| `coupons` | Discount codes | unique `code`, `discountPercent`, `expiresAt` |

Every content table shares the same shape: `visible` + `sortOrder` + optional `createdAt`.
Consistent and clean.

---

## 4. Request Flow

### Public homepage (`src/app/page.tsx`, `force-dynamic`)
```
GET /
 └─ getSettings()                      → 1 query (+ INSERT if missing)
 └─ ensureProofSlideSeed()             → 1 query (every request)
 └─ Promise.all(8 selects)             → packages, sections, banners, notices,
                                          testimonials, faqs, gallery, proofSlides
 = ~10 DB round-trips per pageview, zero caching
 └─ VisitPing (client) → POST /api/visit → UPDATE settings.total_visitors + 1
```

### Order flow
```
PackageCard → /payment/[id]  (server: loads package + payment settings)
  → PaymentForm (client)
      ├─ POST /api/coupons/validate   (public)  → {valid, discountPercent}
      ├─ POST /api/upload             (PUBLIC)  → Vercel Blob → screenshotUrl
      ├─ POST /api/orders             (PUBLIC)  → stores client-supplied price
      └─ window.open(WhatsApp link)   → manual confirmation
```

### Admin
```
/admin/*  → middleware (cookie presence only)
          → (dashboard)/layout.tsx → isAdminAuthed() → redirect /admin/login
          → page fetches /api/<resource> → isAdminAuthed() → Drizzle CRUD
```

---

## 5. Verified Build Health

Commands actually run in this sandbox:

| Check | Command | Result |
|---|---|---|
| Install | `npm install` | ✅ 405 packages, 14s |
| Typecheck | `npx tsc --noEmit` | ✅ **exit 0, zero errors** |
| Lint | `npx eslint .` | ❌ **14 errors, 0 warnings** |
| Build (no env) | `npx next build` | ❌ `Error: DATABASE_URL is required` → *"Failed to collect page data for /api/auth/login"* |
| Build (with env) | `DATABASE_URL=... npx next build` | ✅ **Compiled successfully in 11.7s**, all 38 routes emitted |
| Clean install | `npm ci --dry-run` | ❌ **`Missing: @fastify/busboy@2.1.1 from lock file`** |
| DB reachability | `pg` connect to committed Supabase URL | ⚠️ **`Connection terminated unexpectedly`** — could not confirm from this sandbox (likely egress blocked); **credential validity unverified** |

### Lint errors (all 14)
```
react-hooks/set-state-in-effect ×13   ← 12 admin pages + FloatingButtons.tsx:22
react-hooks/purity              ×1    ← CountdownTimer.tsx:17  (Date.now() during render)
```
These are React 19 / eslint-config-next 16 rules. None are runtime-breaking today, but
`npm run lint` exits non-zero → any CI gate on lint is currently red.

### Build-time DB coupling
`src/db/index.ts` throws at **module load**:
```ts
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
```
Every API route imports `@/db`, so `next build` **cannot run without a DB URL present**, even
though all pages are `force-dynamic` and never actually query during build.

---

## 6. Findings

### 🔴 CRITICAL

**C1 · Production DB credentials committed to git**
`drizzle.config.json`:
```json
"url": "postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
```
A live-looking Supabase pooler URL **with the password inline**, committed in the repo on
`main` in the initial commit. (The literal value is redacted here on purpose — this document is
itself committed, and re-printing the secret would defeat the fix.)
**Rotate this password now** — it is in git history and rotation is the only real fix.
(Liveness unverified from this sandbox; see §5.)

**C2 · Order price is fully client-controlled**
`POST /api/orders` takes `price` straight from the request body and stores it:
```ts
const price = Number(body.price || 0);
...
values({ ..., price: String(price), couponCode: body.couponCode || null, ... })
```
`PaymentForm` computes `finalPrice` in the browser. Nothing re-reads the package price
server-side and nothing re-validates the coupon. Anyone can `curl` an order for
`price: 1`. The admin dashboard "revenue" figure is therefore untrustworthy, and a
customer can claim a discount that was never authorised.

**C3 · The session cookie IS the password hash**
`src/app/api/auth/login/route.ts`:
```ts
res.cookies.set(ADMIN_COOKIE, s.adminPasswordHash, { httpOnly: true, sameSite: "lax", ... });
```
and `isValidSession()` compares the cookie against the stored hash. Consequences:
- The bearer token and the credential hash are the same value. Any leak of the cookie
  (proxy log, shared device, response interception) is equivalent to leaking the hash.
- There is no server-side session store, no expiry, no revocation. The **only** way to
  invalidate a stolen cookie is to change the admin password.
- 30-day `maxAge` with no rotation.

**C4 · Unauthenticated file upload**
`POST /api/upload` has **no `isAdminAuthed()` check** (confirmed in the audit table below).
Anyone on the internet can push up to 8 MB per request into the Vercel Blob store. The
mime check trusts `file.type`, which the client sets. Unbounded storage-cost abuse +
hosting arbitrary attacker images on your domain.

### 🟠 HIGH

**H1 · Weak password hashing with a salt that lives in git**
`src/lib/auth.ts`:
```ts
const SALT = "mihad-boom-shorts-secure-salt-v1";
export function hashPassword(p: string) {
  return crypto.createHash("sha256").update(`${p}::${SALT}`).digest("hex");
}
```
Single-round SHA-256, one global salt, salt committed in source. A GPU cracks this at
billions/sec. Should be `scrypt`/`argon2id` (both in Node stdlib / npm) with a per-password salt.

**H2 · Default admin password `admin123`, never forced to change**
`src/lib/settings.ts` seeds `hashPassword("admin123")` when the settings row is missing.
No first-login password change. Combined with H1 and the absence of any rate limiting on
`POST /api/auth/login`, this is brute-forceable.

**H3 · Non-constant-time password comparison at login**
```ts
if (attemptHash !== s.adminPasswordHash) { ... }   // plain string compare
```
Ironically `isValidSession()` *does* use `crypto.timingSafeEqual`. Login — the more exposed
path — does not.

**H4 · `npm ci` fails on the committed lockfile**
```
npm error Missing: @fastify/busboy@2.1.1 from lock file
```
`@vercel/blob` is in `package.json` dependencies but **absent from the committed
`package-lock.json`** (verified: `grep -c "@vercel/blob" package-lock.json` → `0`).
`npm install` regenerated the lockfile (97 insertions / 114 deletions — I reverted it).
Any CI using `npm ci` is broken; a fresh deploy depends on which install command Vercel picks.

**H5 · Mass assignment on every admin PATCH route**
Pattern repeated in banners / faqs / testimonials / sections / gallery / proof-slides /
free-video-cards / packages / notices:
```ts
const patch: Record<string, unknown> = { ...body };
delete patch.id;
await db.update(table).set(patch).where(eq(table.id, Number(id)));
```
No allowlist, no type validation. Admin-gated, so severity is medium-high rather than
critical — but a malformed client request writes arbitrary columns, and `PATCH /api/settings`
will happily accept any settings column it doesn't explicitly `delete`.

**H6 · TLS verification disabled on the DB connection**
`src/db/index.ts`: `ssl: { rejectUnauthorized: false }` — the DB connection accepts any
certificate, so it is MITM-able on any network path between the app and Supabase.

### 🟡 MEDIUM

**M1 · `freeVideoLink` setting is dead — the button ignores it**
Admin has a full input for `freeVideoLink` (`settings/page.tsx:234`), the schema stores it,
`page.tsx:117` passes it down… and then:
```tsx
// FloatingButtons.tsx:68-70
{freeVideoLink ? (
  <a href="https://mihad-free-video.vercel.app/" ... >   // ← hardcoded
```
`Hero.tsx:37` hardcodes the same URL and never even receives the setting. So whatever the
admin types only toggles visibility; the destination is welded to a Vercel preview URL
(`mihad-ai-voice-o87zuck7c-primetushar325-rgbs-projects.vercel.app` is likewise hardcoded in
two places — and that URL has a deployment-hash in it, so it will rot).

**M2 · The `/free` page and the whole `free_video_cards` table are orphaned**
`grep 'href="/free"'` across `src/` returns exactly **one** hit — inside
`FloatingButtons.tsx.backup`, a file that is never compiled. The live app never links to
`/free`. So: a route, a DB table, a migration, and a full admin CRUD page (`/admin/free-video`)
exist for a page no user can reach.

**M3 ~60 lines of dead code in `FloatingButtons.tsx`**
`voicePosition` state, `dragRef`, a `localStorage`-reading `useEffect`, and three handlers
`startDrag` / `moveDrag` / `endDrag` — with **zero** `onPointer*` bindings in the JSX
(`grep -c "onPointer"` → `0`). This is leftover from when the voice button lived here; it was
extracted to `MihadVoiceButton.tsx` but the corpse was left behind. It is also the source of
lint error #14.

**M4 · Visitor counter is trivially inflatable**
`POST /api/visit` is unauthenticated and unthrottled; the only guard is client-side
`sessionStorage`. One `for` loop in DevTools rewrites the "analytics" number. It is also a
DB `UPDATE` on the singleton settings row on every new session — a write hotspot.

**M5 · ~10 uncached DB round-trips per homepage view**
`force-dynamic` on every page + `ensureProofSlideSeed()` running a `SELECT` on *every*
homepage request (not just the first). No `unstable_cache`, no ISR, no `revalidate`.
On a Supabase pooler this is the main latency and connection-count risk.

**M6 · Coupon codes are enumerable**
`POST /api/coupons/validate` is public and returns `{valid, discountPercent}` with no rate
limit — a script can walk the codespace.

**M7 · No pagination anywhere**
`GET /api/orders` returns *every* order, `desc(createdAt)`, unbounded. Fine at 50 orders,
painful at 5,000. Same for every other list endpoint.

**M8 · Dead weight in `public/`**
- `public/website/` — a complete legacy static HTML site (598-line `style.css`, its own
  `README.md` describing GitHub Pages deployment). Served live at `/website/index.html`.
  Duplicated branding, duplicated hardcoded phone numbers, no relation to the Next app.
- `public/Image` — a 1-byte file, clearly an accident.
- `src/components/FloatingButtons.tsx.backup` — dead file inside `src/`.
- `public/logo.png` is 656 KB and is duplicated byte-for-byte as `public/website/logo.jpg`.

**M9 · Unused dependencies**
`lucide-react` — `grep -rn "lucide-react" src/` → no hits.
`dotenv` — no import anywhere in `src/`.
Both ship in `dependencies`, inflating install time and attack surface.

**M10 · Zero tests**
`find` for `*.test.*` / `*.spec.*` outside `node_modules` → nothing. No test runner in
`package.json`. The pricing logic (`taka`, `discountPercent`) and coupon math are exactly
the kind of pure functions that are cheap to cover and expensive to get wrong.

### 🔵 LOW / HYGIENE

- **L1** No `.gitignore` at all. `node_modules/`, `.next/`, `next-env.d.ts`,
  `tsconfig.tsbuildinfo` all show as untracked right now — one careless `git add .` commits them.
- **L2** No root `README.md`, no `.env.example`. The only README is the dead one in
  `public/website/`.
- **L3** No `error.tsx`, `loading.tsx`, `not-found.tsx`, or `global-error.tsx` anywhere.
  A DB blip on the homepage is an unhandled 500 with the Next default screen.
- **L4** SEO: only root-layout `metadata`. No per-page titles/descriptions, no OpenGraph,
  no `robots.txt`, no `sitemap.xml` — for a service site living on search + social shares.
- **L5** Build warning: `⚠ The "middleware" file convention is deprecated. Please use "proxy"
  instead.` Next 16 wants `src/proxy.ts`.
- **L6** `images.unoptimized: true` **and** every image uses a raw `<img>` with
  `eslint-disable @next/next/no-img-element`. 19 proof screenshots (~1.5 MB) ship at full
  size on the homepage marquee with no `loading="lazy"`, no `srcset`, no WebP/AVIF.
- **L7** Emoji used as UI icons throughout (`🟢` for WhatsApp, `👍` for Facebook, `🎬`,
  `⚙️`) — inconsistent rendering across platforms, and `lucide-react` is installed but unused.
- **L8** No CSRF token; protection rests entirely on `sameSite: "lax"` + JSON content type.
- **L9** Hardcoded business data in the schema defaults: `8801609371023`,
  `01609371023`, a specific Facebook profile ID, Bengali payment notice text. Belongs in
  env/seed data, not in a migration.
- **L10** Mixed English/Bengali strings inline; no i18n layer.
- **L11** `sections.items` is `jsonb` typed as `unknown` and cast at the render site —
  no runtime validation of admin-entered JSON.
- **L12** No rate limiting on any endpoint (login, upload, visit, coupon validate, orders).
- **L13** `package.json` `name` is still the template default `"nextjs-postgresql-template"`.
- **L14** `next.config.ts` sets `images.unoptimized` but never configures `remotePatterns` —
  so `next/image` could not be adopted without also adding the Blob/Drive/YouTube domains.

---

## 7. API Auth Audit (all 31 routes, verified by grep)

| Route | Methods | Auth |
|---|---|---|
| `/api/auth/login` | POST | — (intentional) |
| `/api/auth/logout` | POST | — |
| `/api/auth/me` | GET | ✅ |
| `/api/health` | GET | — (intentional) |
| `/api/coupons/validate` | POST | ⚠️ **public** — enumerable (M6) |
| `/api/upload` | POST | 🔴 **public** — unauthenticated write (C4) |
| `/api/visit` | POST | ⚠️ **public** — inflatable counter (M4) |
| `/api/orders` | **POST** | 🔴 **public** — accepts client `price` (C2) |
| `/api/orders` | GET | ✅ |
| `/api/orders/[id]` | PATCH, DELETE | ✅ (status-only patch — good) |
| `/api/settings` | GET | ✅ partial (`publicSettings` strips hash — good) |
| `/api/settings` | PATCH | ✅ |
| `/api/dashboard` | GET | ✅ |
| `/api/coupons` | GET, POST | ✅ |
| `/api/packages` · `banners` · `faqs` · `gallery` · `notices` · `sections` · `testimonials` · `proof-slides` · `free-video-cards` | GET | — public by design (site reads) |
| same, POST | POST | ✅ |
| same `/[id]` | PATCH, DELETE | ✅ |

**Summary:** every mutating admin endpoint is correctly gated except the three that are
deliberately public — and two of those three (`/api/upload`, `/api/orders`) should not be
as permissive as they are.

---

## 8. What Is Genuinely Good

Worth saying, because it shapes what a rewrite should preserve:

- **Clean, consistent data model.** Every content table follows the same
  `visible` / `sortOrder` contract. Adding a 13th table is obvious.
- **Typecheck is completely clean** under `strict: true` across 121 files — non-trivial.
- **Auth layering is thoughtfully split.** Middleware does a cheap cookie-presence check and
  says so in a comment; the real verification happens server-side in the layout *and* in every
  route handler. `publicSettings()` deliberately strips the hash before any public response.
- **Server Components do the data fetching.** No client-side waterfalls on the homepage;
  `Promise.all` over 8 queries.
- **`timingSafeEqual` is already used** in `isValidSession` — the instinct is right, it just
  was not applied to the login path.
- **Drizzle migrations are real and journaled** (2 migrations + snapshots), not hand-written SQL.
- **The admin UI is complete.** 13 dashboard pages covering every table, with a shared
  `ui.tsx` primitive set (`Field`, `TextInput`, `TextArea`, `Button`, `Card`, `PageHeader`,
  `Toggle`) and responsive sidebar + mobile nav.
- **`orders/[id]` PATCH is correctly narrowed** to `status` only — proof the author knows the
  mass-assignment pattern is dangerous; it just was not applied consistently.

---

## 9. Suggested Priority Order

**Do before anything else**
1. Rotate the Supabase password; move the URL to `DATABASE_URL` and delete it from
   `drizzle.config.json` (add `.env.example`, add `.gitignore`). — C1
2. Re-derive order price server-side from `packageId`; re-validate the coupon in
   `POST /api/orders`. — C2
3. Add `isAdminAuthed()` to `POST /api/upload`. — C4
4. Replace the hash-as-cookie with an opaque random session id; move password hashing to
   `scrypt`/`argon2id`; force a password change off `admin123`; use `timingSafeEqual` at
   login; add login rate limiting. — C3, H1, H2, H3
5. Regenerate and commit a correct `package-lock.json` so `npm ci` works. — H4

**Then**
6. Delete the dead code and dead weight: `FloatingButtons.tsx` drag block +
   `.backup`, `public/website/`, `public/Image`, `lucide-react`, `dotenv`. — M3, M8, M9
7. Decide the fate of `/free`: either link to it (and honour `freeVideoLink`) or remove the
   route + table + admin page. — M1, M2
8. Add an allowlist to every PATCH route. — H5
9. Fix the 14 lint errors so `npm run lint` is a usable CI gate. — §5
10. Add `.gitignore`, root `README.md`, `error.tsx` / `loading.tsx` / `not-found.tsx`,
    per-page metadata + `robots.txt` + `sitemap.xml`. — L1–L4

**Then, if this is going to carry real traffic**
11. Cache the homepage (`unstable_cache` or ISR) and stop running the proof-seed check on
    every request. — M5
12. Paginate the list endpoints. — M7
13. Rate-limit `/api/visit`, `/api/coupons/validate`, `/api/auth/login`. — M4, M6, L12
14. Optimise images: drop `unoptimized`, add `remotePatterns`, move to `next/image` with
    lazy loading for the 19 proof screenshots. — L6
15. Add tests for `format.ts`, coupon math, and the order endpoint. — M10
