-- ===========================================================================
-- BOOM SHORTS — Row Level Security policies
--
-- Apply ONCE against the Supabase project:
--     psql "$DATABASE_URL" -f drizzle/rls-policies.sql
--   or paste into the Supabase SQL Editor.
--
-- ---------------------------------------------------------------------------
-- IMPORTANT — READ THIS BEFORE RELYING ON RLS
-- ---------------------------------------------------------------------------
-- The Next.js app connects with the pooler/superuser role. Postgres does NOT
-- enforce RLS against a table's owner or a superuser, so these policies do
-- not change how the server-side Drizzle queries behave.
--
-- Authorisation in this system is enforced in TWO places:
--   1. Server-side, in every API route handler / server component
--      (src/lib/requireAdmin.ts, src/lib/requireCustomer.ts).
--      This is the layer that actually protects today's traffic.
--   2. These RLS policies — defence in depth. They become the primary
--      protection the moment anything talks to Supabase with the *anon* key
--      (e.g. a future native Android admin app, or the Supabase JS client in
--      the browser). Without them, handing out the anon key would leak every
--      customer's orders.
--
-- Net effect: applying this file is safe (owner connections are unaffected)
-- and it makes the anon key safe to publish.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
ALTER TABLE settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_features   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections           ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery            ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_slides       ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_video_cards   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sessions  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- PUBLIC CONTENT — readable by anyone (anon), writable by nobody.
-- All writes go through the authenticated Admin App using the server key.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "public read packages"          ON packages;
CREATE POLICY "public read packages" ON packages
  FOR SELECT TO anon, authenticated
  USING (archived = false);

DROP POLICY IF EXISTS "public read package features"   ON package_features;
CREATE POLICY "public read package features" ON package_features
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public read banners"            ON banners;
CREATE POLICY "public read banners" ON banners
  FOR SELECT TO anon, authenticated USING (visible = true);

DROP POLICY IF EXISTS "public read notices"            ON notices;
CREATE POLICY "public read notices" ON notices
  FOR SELECT TO anon, authenticated USING (visible = true);

DROP POLICY IF EXISTS "public read faqs"               ON faqs;
CREATE POLICY "public read faqs" ON faqs
  FOR SELECT TO anon, authenticated USING (visible = true);

DROP POLICY IF EXISTS "public read gallery"            ON gallery;
CREATE POLICY "public read gallery" ON gallery
  FOR SELECT TO anon, authenticated USING (visible = true);

DROP POLICY IF EXISTS "public read proof slides"       ON proof_slides;
CREATE POLICY "public read proof slides" ON proof_slides
  FOR SELECT TO anon, authenticated USING (visible = true);

DROP POLICY IF EXISTS "public read free video cards"   ON free_video_cards;
CREATE POLICY "public read free video cards" ON free_video_cards
  FOR SELECT TO anon, authenticated USING (visible = true);

DROP POLICY IF EXISTS "public read sections"           ON sections;
CREATE POLICY "public read sections" ON sections
  FOR SELECT TO anon, authenticated USING (visible = true);

-- Reviews: only admin-approved AND visible rows are publicly readable.
DROP POLICY IF EXISTS "public read approved reviews"   ON testimonials;
CREATE POLICY "public read approved reviews" ON testimonials
  FOR SELECT TO anon, authenticated
  USING (approved = true AND visible = true);

-- Settings: the row contains payment numbers and social links the site needs,
-- but ALSO admin_password_hash. Reading it with anon would leak the hash, so
-- anon gets NO access; the server reads it with the privileged role and strips
-- sensitive fields before rendering.
-- (No policy created => default deny. This is intentional.)

-- ---------------------------------------------------------------------------
-- CUSTOMER PRIVATE DATA
--
-- `request.jwt.claims ->> 'sub'` is the customer id set by Supabase Auth.
-- A customer may only ever touch their own rows.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "customer reads own orders"      ON orders;
CREATE POLICY "customer reads own orders" ON orders
  FOR SELECT TO authenticated
  USING (customer_id = nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::int);

DROP POLICY IF EXISTS "customer reads own order items" ON order_items;
CREATE POLICY "customer reads own order items" ON order_items
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id = nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::int
    )
  );

DROP POLICY IF EXISTS "customer reads own profile"     ON customers;
CREATE POLICY "customer reads own profile" ON customers
  FOR SELECT TO authenticated
  USING (id = nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::int);

-- Payments contain transaction ids and screenshot paths: server-only.
-- (No policy => default deny for anon/authenticated.)

-- ---------------------------------------------------------------------------
-- ADMIN-ONLY TABLES — default deny for anon and authenticated.
-- Only the privileged server role (table owner) can read/write these.
-- ---------------------------------------------------------------------------
-- admin_users, admin_sessions, customer_sessions, payments, settings, coupons
-- intentionally have NO permissive policy, which means deny-by-default.

-- ---------------------------------------------------------------------------
-- Sanity check: confirm RLS is on for every table.
-- ---------------------------------------------------------------------------
-- SELECT relname, relrowsecurity FROM pg_class
-- WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace
-- ORDER BY relname;
