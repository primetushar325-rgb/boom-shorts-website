# Boom Shorts

Premium YouTube Shorts & channel-services storefront — a **customer website** and a
**separate mobile-first Admin App** sharing **one Supabase (Postgres) backend**.

```
CUSTOMER WEBSITE  ──┐
                    ├──▶  SUPABASE (Postgres + Storage)
ADMIN APP  ─────────┘
```

Anything the admin changes — price, discount, YouTube demo, availability,
homepage visibility, package order — is reflected on the customer website on the
next request, with no redeploy.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4 |
| Language | TypeScript (strict) |
| ORM | Drizzle ORM |
| Database | Supabase Postgres |
| Screenshots | Supabase Storage (private bucket, signed URLs) |
| Tests | PGlite (real Postgres in WASM) + tsx |

---

## Two apps, one repo

Both live in this Next.js project as **separate route groups with their own root
layouts** — different `<html>`, theme, navigation and auth gate. The customer
site never links to the admin, and the admin is `robots: noindex`.

| App | Path | Theme |
|---|---|---|
| Customer Website | `/` `(site)` group | Light, blue/navy, mobile-first |
| Admin App | `/admin` | Dark, Android-style, bottom tab bar |

> **Why not two repositories?** One deployment means one set of secrets, one
> build, and no cross-origin auth to maintain — while still giving genuinely
> separate applications. Splitting into `apps/web` + `apps/admin` later is a
> mechanical move; the route groups already isolate them.

### Customer routes

| Route | Purpose |
|---|---|
| `/` | Home — compact package grid (2 cols mobile, 3–4 desktop) |
| `/checkout/[packageId]` | Demo video → package info → payment → submit |
| `/order/[orderNumber]` | Order received / status |
| `/orders` | Order history (session, or lookup by WhatsApp) |
| `/profile` | Account |
| `/free`, `/demo` | Free videos, demo |
| `/payment/[id]` | Legacy → redirects to `/checkout/[id]` |

### Admin sections

Dashboard · Orders · Packages · Customers · Payments · Product Videos · Reviews ·
Coupons · Banner · Settings

---

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in real values
npm run db:migrate             # apply migrations to Supabase
npm run dev
```

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | Service-layer tests against in-process Postgres |
| `npm run test:integration` | Route handler + page rendering tests |
| `npm run test:all` | Both suites |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |

### First admin account

Sign in at `/admin/login`. While no admin exists the page shows a **one-time
setup form** (it 403s forever once one admin exists). Alternatively set
`ADMIN_EMAIL` / `ADMIN_PASSWORD` to provision automatically.

If you are upgrading an installation that used the old shared password, that
password still works once — it promotes you to a real account and asks you to
set a personal password.

---

## Database

19 tables. The migration history is **additive only** — no table is dropped and
no data is truncated. Migration `0002_boom_ecosystem` adds the new structure and
backfills existing rows:

- existing orders get a `BBS-######` order number
- legacy `price` is mirrored into `base_price` / `final_amount`
- `badge = 'bestseller'` → `is_best_seller`
- **existing public reviews stay public** (`approved` backfilled from `visible`)
- historical orders get `order_items` and `payments` rows
- orders are linked to deduplicated `customers` records

### Money

Prices are `numeric(10,2)`. The server derives every amount:

```
discount  = discount_amount > 0 ? discount_amount
                                : round(base_price * discount_percent / 100)
final     = max(0, base_price - discount)
```

The customer website **never sends a price**. `POST /api/orders` reloads the
package, re-validates the coupon, and stamps the computed amount — so the
frontend cannot influence what is stored.

### Row Level Security

`drizzle/rls-policies.sql` enables RLS on every table. Note the nuance: the app
connects with the privileged role, and Postgres does **not** enforce RLS against
a table owner — so today's authorisation is enforced server-side in every route
handler. The policies are defence in depth, and they are what makes the **anon
key safe to publish** if you later build a native app on the Supabase JS client.

Apply once:

```bash
psql "$DATABASE_URL" -f drizzle/rls-policies.sql
```

---

## Security

| Concern | Implementation |
|---|---|
| Passwords | scrypt, per-password random salt (`src/lib/password.ts`) |
| Sessions | Opaque random token; only its SHA-256 digest is stored; revocable |
| Admin authz | `requireAdminJson()` in **every** mutating route — never UI-only |
| Uploads | Signed short-lived token, or an admin session; type + size validated |
| Duplicate orders | Unique index on `payments(method, transaction_id)` |
| Login brute force | Per-IP throttle, 8 attempts / 5 minutes |
| Screenshots | Private bucket; admins get 10-minute signed URLs |
| Secrets | Env vars only. `.env*` is git-ignored. Nothing in source. |

---

## Testing

Both suites boot **PGlite** (real Postgres compiled to WASM), apply every
committed migration, then exercise the shipped code — never a re-implementation.

```bash
npm test                # service layer   (24 assertions)
npm run test:integration # HTTP + pages   (20 assertions)
npm run test:all
```

**`npm test`** — service layer:

- all 19 tables created; no `DROP TABLE` in any migration
- pricing (percentage vs. taka discount, clamping, strikethrough, percent-off)
- YouTube id extraction across every URL shape, plus rejection of bad input
- scrypt hashing, legacy-hash compatibility, upload-token tampering
- **real `createOrder`**: order number format, server-side price, customer /
  order_item / payment rows, duplicate transaction rejection, unavailable
  package rejection, field validation, coupon apply + expiry, order-number
  uniqueness

**`npm run test:integration`** — the real Next.js handlers and page components:

- `POST /api/orders`: 201 with an order number; **a client-supplied `price` is
  ignored**; duplicate transaction → 409; unknown package → 404; missing fields → 400
- `POST /api/coupons/validate`: active coupon applies, disabled/unknown rejected,
  minimum order enforced
- `HomePage()`: visible packages reach the cards, `visible=false` packages do not
  render, and **only admin-approved reviews** appear
- `PackageCard` rendered to markup: formatted `৳400`, strikethrough, Available
  badge, feature ticks, CTA linking to `/checkout/…`
- `CheckoutPage()`: package, final + strikethrough price, `Save 20%` pill, the
  extracted YouTube id, and the configured payment numbers handed to the form
- checkout for an unavailable package shows the notice and **no order button**
- **`drizzle/rls-policies.sql` applies cleanly**: every statement executes, RLS
  ends up on all 19 tables (including `settings`), the 13 expected policies
  exist, and sensitive tables (`settings`, `payments`, `admin_users`,
  `admin_sessions`, `coupons`) have **no** permissive policy — deny by default.
  The test creates the `anon`/`authenticated` roles that Supabase provisions
  and PGlite lacks.

> Admin-gated routes are not in the integration suite because `cookies()` throws
> outside a Next request scope. They were verified over real HTTP instead:
> unauthenticated `GET /api/orders`, `/api/dashboard`, `/api/customers` and
> `/api/payments` all return **401**, and `/admin` redirects **307** to `/admin/login`.

Two of these tests caught real defects during development: a transaction
deadlock in `createOrder`, and a tree-walk that silently passed while seeing
nothing.

---

## Optional integrations

**Automatic WhatsApp notifications.** By default the success page opens a
prefilled `wa.me` link — no external service needed. For automatic server-side
sending, set `WHATSAPP_CLOUD_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` (Meta →
WhatsApp → API Setup). The code detects them and switches over.

**Supabase Storage.** Create a **private** bucket:

```sql
insert into storage.buckets (id, name, public)
values ('payment-screenshots', 'payment-screenshots', false);
```

Without it, screenshots fall back to Vercel Blob so an existing deployment keeps
working.
