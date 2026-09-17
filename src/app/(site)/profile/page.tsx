import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { customers, orders, settings } from "@/db/schema";
import { getCustomerSession } from "@/lib/session";
import { taka } from "@/lib/pricing";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders";
import { normalizePhone } from "@/lib/whatsapp";
import BottomNav from "@/components/site/BottomNav";
import OrdersLookup from "../orders/OrdersLookup";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Profile" };

function statusOf(status: string): OrderStatus {
  return (status as OrderStatus) in ORDER_STATUS_LABELS ? (status as OrderStatus) : "pending";
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const { phone } = await searchParams;
  const session = await getCustomerSession();

  // Identity model matches /orders: a signed-in session wins, otherwise the
  // visitor looks themselves up by the WhatsApp number they ordered with.
  const lookup = (session?.whatsapp ?? phone ?? "").trim();

  let customer: { id: number; name: string; whatsapp: string; createdAt: Date } | null = null;

  if (session) {
    customer = {
      id: session.id,
      name: session.name,
      whatsapp: session.whatsapp,
      // The session carries no createdAt; fall back to the row.
      createdAt:
        (
          await db
            .select({ createdAt: customers.createdAt })
            .from(customers)
            .where(eq(customers.id, session.id))
            .limit(1)
        )[0]?.createdAt ?? new Date(),
    };
  } else if (lookup) {
    const normalized = normalizePhone(lookup);
    const found = await db
      .select({
        id: customers.id,
        name: customers.name,
        whatsapp: customers.whatsapp,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .where(eq(customers.whatsapp, normalized))
      .limit(1);
    customer = found[0] ?? null;
  }

  if (!customer) {
    return (
      <main className="min-h-screen bg-bs-bg pb-24 md:pb-12">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <h1 className="text-xl font-extrabold text-bs-ink sm:text-2xl">My Profile</h1>
          <p className="mt-1 text-sm text-bs-muted">
            See your order history, spend and account details in one place.
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-bs-line bg-white px-6 py-14 text-center">
            <p className="text-3xl">👤</p>
            <p className="mt-2 text-sm font-bold text-bs-ink">
              {lookup ? "No profile found for that number" : "Look up your profile"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-bs-muted">
              Enter the WhatsApp number you used when ordering. We never ask for a password.
            </p>
            <OrdersLookup initial={lookup} to="/profile" />
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  // The WhatsApp support card is decorative, so it is resolved only once a
  // customer exists — the lookup state must render without a database query.
  const [support] = await db
    .select({ whatsapp: settings.whatsappNumber })
    .from(settings)
    .limit(1);

  // Aggregate over every order tied to this customer, including legacy rows
  // recorded before the customers table existed (matched by WhatsApp).
  const [stats] = (await db
    .select({
      total: sql<number>`count(*)::int`,
      spent: sql<number>`coalesce(sum(coalesce(final_amount, price, 0)), 0)::numeric`,
      completed:
        sql<number>`count(*) filter (where status = 'completed')::int`,
      pending: sql<number>`count(*) filter (where status in ('pending', 'confirmed', 'processing'))::int`,
    })
    .from(orders)
    .where(sql`${orders.customerId} = ${customer.id} or ${orders.whatsapp} = ${customer.whatsapp}`)) as unknown as {
    total: number;
    spent: string | number;
    completed: number;
    pending: number;
  }[];

  const recent = await db
    .select()
    .from(orders)
    .where(sql`${orders.customerId} = ${customer.id} or ${orders.whatsapp} = ${customer.whatsapp}`)
    .orderBy(desc(orders.createdAt))
    .limit(5);

  const totalOrders = stats?.total ?? 0;
  const totalSpent = Number(stats?.spent ?? 0);

  const tiles = [
    { label: "Total Orders", value: String(totalOrders), tone: "text-bs-ink" },
    { label: "Total Spent", value: taka(totalSpent), tone: "text-bs-primary" },
    { label: "Completed", value: String(stats?.completed ?? 0), tone: "text-bs-success" },
    { label: "In Progress", value: String(stats?.pending ?? 0), tone: "text-bs-gold" },
  ];

  return (
    <main className="min-h-screen bg-bs-bg pb-24 md:pb-12">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-xl font-extrabold text-bs-ink sm:text-2xl">My Profile</h1>
        <p className="mt-1 text-sm text-bs-muted">
          Your account details and order summary.
        </p>

        <section className="mt-5 rounded-2xl border border-bs-line bg-white p-5 shadow-bs-card">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-bs-primary-soft text-lg font-extrabold text-bs-primary">
              {customer.name.trim().charAt(0).toUpperCase() || "👤"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold text-bs-ink">{customer.name}</p>
              <p className="mt-0.5 text-sm font-semibold text-bs-muted">{customer.whatsapp}</p>
              <p className="mt-1 text-[11px] text-bs-muted">
                Customer since{" "}
                {new Date(customer.createdAt).toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="rounded-2xl border border-bs-line bg-white p-4 shadow-bs-card"
            >
              <p className={`text-lg font-extrabold ${tile.tone}`}>{tile.value}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-bs-muted">{tile.label}</p>
            </div>
          ))}
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-bs-ink">Recent Orders</h2>
            <Link
              href={session ? "/orders" : `/orders?phone=${encodeURIComponent(customer.whatsapp)}`}
              className="text-xs font-bold text-bs-primary hover:underline"
            >
              View all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-bs-line bg-white px-6 py-12 text-center">
              <p className="text-3xl">🧾</p>
              <p className="mt-2 text-sm font-bold text-bs-ink">No orders yet</p>
              <p className="mt-1 text-xs text-bs-muted">
                Once you place an order it will appear here.
              </p>
              <Link
                href="/#packages"
                className="mt-4 inline-block rounded-xl bg-bs-primary px-5 py-2.5 text-sm font-bold text-white"
              >
                Browse Packages
              </Link>
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/order/${o.orderNumber}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-bs-line bg-white p-4 shadow-bs-card transition hover:border-bs-primary/40 hover:shadow-bs-lift"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-bs-primary">
                        #{o.orderNumber}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-bold text-bs-ink">
                        {o.packageName}
                      </p>
                      <p className="text-[11px] text-bs-muted">
                        {new Date(o.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-extrabold text-bs-ink">
                        {taka(o.finalAmount ?? o.price)}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-bs-muted">
                        {ORDER_STATUS_LABELS[statusOf(o.status)]}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {support?.whatsapp ? (
          <a
            href={`https://wa.me/${support.whatsapp.replace(/[^\d]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-bs-line bg-bs-success-soft p-4 transition hover:shadow-bs-lift"
          >
            <div>
              <p className="text-sm font-extrabold text-bs-success">Need help with an order?</p>
              <p className="mt-0.5 text-xs text-bs-muted">Chat with our team on WhatsApp.</p>
            </div>
            <span className="shrink-0 rounded-xl bg-bs-success px-4 py-2 text-xs font-bold text-white">
              Start Chat
            </span>
          </a>
        ) : null}
      </div>
      <BottomNav />
    </main>
  );
}
