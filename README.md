# Boom Shorts — Website + Customer App + Admin App

Premium storefront for **Boom Shorts / Voice Over Shorts** videos, built with:

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Tailwind CSS v4** (light, mobile-first design system in `src/app/globals.css`)
- **PostgreSQL** (Supabase in production) via **Drizzle ORM**
- **Supabase Storage** for private payment screenshots and public site images
- Deployed on the existing **Vercel** project → https://boom-shorts-website.vercel.app

```
src/app/(site)      customer website (home, checkout, orders, reviews, profile, free, demo, payment)
src/app/admin       admin app (login + single auth-gated shell with 17 sections)
src/app/api         REST endpoints (public, customer, admin)
src/db              Drizzle schema, pool, idempotent runtime schema sync
src/lib             auth, sessions, pricing, coupons, orders, storage, settings, helpers
drizzle             SQL migrations (0000, 0001, 0002)
```

## Local development

```bash
npm install
cp .env.example .env.local     # fill in DATABASE_URL (+ Supabase keys, optional)
npm run dev                    # http://localhost:3000
```

Quality gates used before every deploy:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm run build       # next build (production)
```

End-to-end suite (runs against a *running* server and creates then removes test
rows — never point it at production):

```bash
npm run build && npm start          # terminal 1
E2E_ALLOW_WRITES=1 npm run test:e2e # terminal 2 (defaults to http://127.0.0.1:3000)
```

It covers public pages, admin auth, server-side package pricing (percent + fixed),
coupons (valid/expired/min-order), order creation, duplicate-submit protection,
customer isolation, review moderation, the admin order/payment flow, screenshot
privacy and homepage rendering.

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres/Supabase connection string (use the pooler URI on Vercel). |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL (Storage API). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | recommended | Public anon key. |
| `SUPABASE_SECRET_KEY` | yes | Server-side secret key: private screenshot uploads + short-lived signed URLs. |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Legacy fallback only — ignored when `SUPABASE_SECRET_KEY` is set. |
| `SESSION_SECRET` | optional | Extra cookie signing secret (derived from `DATABASE_URL` when empty). |
| `NEXT_PUBLIC_SITE_URL` | optional | Canonical URL for metadata, `sitemap.xml`, `robots.txt`. |
| `BLOB_READ_WRITE_TOKEN` | optional | Vercel Blob fallback for public image uploads when Supabase Storage is absent. |
| `ADMIN_DEFAULT_PASSWORD` | optional | Password used only when the settings row is created for the very first time (default `admin123`). |

Real values live **only** in Vercel → Project → Settings → Environment Variables and in your local `.env.local` (git-ignored). Nothing secret is committed.

## Supabase setup (one-off, already true for the existing project)

1. Storage → bucket **`payment-screenshots`** — **private** (no public policies). Payment screenshots are stored here as `sb://payment-screenshots/<path>` and are only reachable through `GET /api/admin/screenshot/[orderId]`, which requires an admin session and returns a 5-minute signed URL.
2. Storage → bucket **`site-images`** (optional) — public bucket for banner/gallery/logo uploads. Without it, uploads fall back to Vercel Blob.
3. Row Level Security: RLS is **enabled on all tables** and **no public policies** are granted, so the anon/public API key cannot read or write anything directly. The app talks to Postgres with the owner connection string (`DATABASE_URL`) from server routes only, and applies its own authorization checks (`isAdminAuthed` for admin routes, customer session cookie for customer routes).

## Database

- Migrations live in `drizzle/` and are additive/backward-compatible (`0002_production_ready.sql` only adds tables, columns, indexes and backfills — no data is dropped).
- `src/db/ensureSchema.ts` additionally runs an idempotent sync on first request: it creates any missing base table, adds missing columns, backfills legacy rows and enables RLS. That means a fresh database (or a preview deployment) boots correctly without a manual migration step, and the existing production database is untouched.
- Optional manual migration: `npx drizzle-kit migrate` (requires `DATABASE_URL`).

## Admin app

- URL: `/admin` (login at `/admin/login`).
- Mobile-first: three phone-sized screens (menu → list → detail), bottom navigation, touch-friendly cards; the same layout expands to a 3-column desktop dashboard.
- Sections: Dashboard, Orders, Payments, Customers, Packages, Product Videos, Reviews, Coupons, Banners, Notices, Testimonials, Client Proof, Gallery, Free Videos, FAQs, Custom Sections, Settings.
- Default password is `admin123` until changed in **Settings → Security** (stored as a salted SHA-256 hash; changing it invalidates old admin sessions).

## Payments & orders

- Manual bKash / Nagad / Rocket Send Money flow with transaction ID + screenshot.
- All pricing is computed **server-side** (`src/lib/pricing.ts`): percent discount `1000 − 20% = 800`, fixed discount `1000 − 200 = 800`, never below `0`.
- Coupons are validated on the server (`/api/coupons/validate` then re-checked when the order is created); browser-submitted amounts are ignored.
- Duplicate submits are detected by transaction ID and return the existing order instead of creating a second one.
- Customers see only their own orders; WhatsApp follow-up uses `wa.me` click-to-chat (no Cloud API).

## Deployment checklist (existing Vercel project)

1. Vercel → Project → Settings → Environment Variables: set the names above for **Production** (and Preview if you use it).
2. Push to `main` (or merge the PR) — Vercel auto-builds with `npm run build`.
3. After the first deploy, open `/api/health` (should return `{"ok":true,...}`) and `/admin` to confirm the database connection.
4. Confirm the `payment-screenshots` bucket is private and the env var `SUPABASE_SECRET_KEY` is set, otherwise payment screenshots fall back to local/dev storage and are not uploaded.
