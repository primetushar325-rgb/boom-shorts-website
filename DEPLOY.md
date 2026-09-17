# Deploying BOOM SHORTS to Vercel

The app is deployment-ready — `npm run build` passes with 46/46 routes and all
64 automated tests pass. This runbook covers the last mile, which needs an
account login that a CI sandbox cannot perform.

## 1. Environment variables

Set these in **Vercel → your project → Settings → Environment Variables**.
Apply to Production (and Preview if you want). Never put them in source code.

| Variable | Value | Sensitive |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://postgres.<PROJECT_REF>:<URL_ENCODED_PASSWORD>@<POOLER_HOST>:5432/postgres` | 🔒 yes |
| `SUPABASE_URL` | `https://<PROJECT_REF>.supabase.co` | no |
| `SUPABASE_SERVICE_ROLE_KEY` *(or `SUPABASE_SECRET_KEY`)* | from Project Settings → API | 🔒 yes |
| `NEXT_PUBLIC_SITE_URL` | `https://boom-shorts-website.vercel.app` | no |
| `NEXT_PUBLIC_SUPABASE_URL` | same as `SUPABASE_URL` | no |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_...` key | no (public by design) |

### ⚠️ URL-encode the database password

The password goes **inside a URL**, so reserved characters must be percent-encoded
or the connection fails with a confusing auth error.

| Character | Becomes |
| --- | --- |
| `@` | `%40` |
| `?` | `%3F` |
| `#` | `%23` |
| `&` | `%26` |
| `:` | `%3A` |
| `/` | `%2F` |
| space | `%20` |

The project's current password contains `@` and `?`, so it **must** be encoded.

### Which pooler?

- **Session pooler, port `5432`** — what `DATABASE_URL` above points at. Works
  with `pg`'s default queries and with migrations.
- Transaction pooler (port `6543`) is for very high serverless concurrency.
  This codebase uses no *named* prepared statements, so it is also safe, but
  session mode is the lower-risk default.

## 2. Create the private Storage bucket

Payment screenshots need this, and uploads fail without it.

**Supabase → Storage → New bucket**
- Name: `payment-screenshots`
- **Private**: ✅ ticked (do not make it public)

Optionally rename via `SUPABASE_SCREENSHOT_BUCKET`.

## 3. Run the migrations once

Against the real database, from a machine that can reach it:

```bash
export DATABASE_URL="postgresql://postgres.<REF>:<ENCODED_PW>@<POOLER_HOST>:5432/postgres"
npm run db:migrate
```

Then apply the RLS policies:

```bash
psql "$DATABASE_URL" -f drizzle/rls-policies.sql
```

`psql` handles `--` comments correctly. (Do not split this file on `;` and drop
comment-led chunks — that silently discards the `settings` RLS statement.)

## 4. Deploy

```bash
npm i -g vercel
vercel link        # pick the EXISTING boom-shorts-website project — do not create a new one
vercel --prod
```

To avoid a duplicate production site, link to the existing project rather than
letting the CLI create one. If the repo is already connected in the Vercel
dashboard, pushing to the production branch deploys automatically.

## 5. Post-deploy checks

| Check | How |
| --- | --- |
| Build | Vercel → Deployments → status "Ready" |
| Homepage | `https://boom-shorts-website.vercel.app/` shows packages from the database |
| Admin gate | `/admin` redirects to `/admin/login` |
| Admin login | first admin via `POST /api/auth/setup` while `admin_users` is empty |
| API guard | `GET /api/orders` returns **401** unauthenticated |
| Order flow | place a test order, confirm `BBS-######` and a stored screenshot path |
| Screenshot privacy | the stored path is **not** a public URL; admin views it via a signed URL |
| WhatsApp | the order page's "Send on WhatsApp" opens `wa.me` with the order details |
| SEO | `/robots.txt` disallows `/admin`; `/sitemap.xml` lists packages |

## 6. If a deploy fails

- **`DATABASE_URL is required`** — the variable is missing in the *Production*
  environment, or the deployment predates adding it. Redeploy after setting it.
- **Auth error on connect** — the password almost certainly needs URL-encoding
  (see step 1).
- **`Bucket "payment-screenshots" may not exist`** — create the bucket (step 2).
- **`Screenshot storage is not configured`** — `SUPABASE_URL` or the server-side
  key is missing. The upload fails loudly by design rather than falling back to
  a public bucket; set `ALLOW_PUBLIC_SCREENSHOT_FALLBACK=true` only if you
  genuinely accept public screenshots.
