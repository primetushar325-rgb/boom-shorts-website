import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { getCustomerSession } from "@/lib/session";
import { taka } from "@/lib/pricing";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders";
import BottomNav from "@/components/site/BottomNav";
import OrdersLookup from "./OrdersLookup";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Orders" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const { phone } = await searchParams;
  const session = await getCustomerSession();

  // Signed-in customers see their own history; guests can look up by WhatsApp.
  const lookup = (session?.whatsapp ?? phone ?? "").trim();

  let list: (typeof orders.$inferSelect)[] = [];
  let signedIn = false;

  if (session) {
    signedIn = true;
    list = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, session.id))
      .orderBy(desc(orders.createdAt))
      .limit(100);
  } else if (lookup) {
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.whatsapp, lookup))
      .limit(1);
    if (customer) {
      list = await db
        .select()
        .from(orders)
        .where(eq(orders.customerId, customer.id))
        .orderBy(desc(orders.createdAt))
        .limit(100);
    } else {
      list = await db
        .select()
        .from(orders)
        .where(eq(orders.whatsapp, lookup))
        .orderBy(desc(orders.createdAt))
        .limit(100);
    }
  }

  return (
    <main className="min-h-screen bg-bs-bg pb-24 md:pb-12">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-xl font-extrabold text-bs-ink sm:text-2xl">My Orders</h1>
        <p className="mt-1 text-sm text-bs-muted">
          Track your order status and payment verification.
        </p>

        {session ? (
          <p className="mt-3 text-xs font-semibold text-bs-success">
            ✓ Signed in as {session.name} ({session.whatsapp})
          </p>
        ) : (
          <OrdersLookup initial={lookup} />
        )}

        {list.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-bs-line bg-white px-6 py-14 text-center">
            <p className="text-3xl">🧾</p>
            <p className="mt-2 text-sm font-bold text-bs-ink">
              {signedIn ? "No orders yet" : "No orders found"}
            </p>
            <p className="mt-1 text-xs text-bs-muted">
              {signedIn
                ? "Once you place an order it will appear here."
                : "Enter the WhatsApp number you used to order."}
            </p>
            <Link
              href="/#packages"
              className="mt-4 inline-block rounded-xl bg-bs-primary px-5 py-2.5 text-sm font-bold text-white"
            >
              Browse Packages
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {list.map((o) => {
              const status = (o.status as OrderStatus) in ORDER_STATUS_LABELS ? (o.status as OrderStatus) : "pending";
              return (
                <li key={o.id}>
                  <Link
                    href={`/order/${o.orderNumber}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-bs-line bg-white p-4 shadow-bs-card transition hover:border-bs-primary/40 hover:shadow-bs-lift"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-bs-primary">
                        #{o.orderNumber}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-bold text-bs-ink">{o.packageName}</p>
                      <p className="text-[11px] text-bs-muted">
                        {new Date(o.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-extrabold text-bs-ink">
                        {taka(o.finalAmount ?? o.price)}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-bs-muted">
                        {ORDER_STATUS_LABELS[status]}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
