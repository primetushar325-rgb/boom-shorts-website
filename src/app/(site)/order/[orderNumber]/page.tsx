import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { taka } from "@/lib/pricing";
import { buildWhatsAppLink, orderWhatsAppMessage } from "@/lib/whatsapp";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Order Details" };

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-bs-primary-soft text-bs-primary border-blue-200",
  processing: "bg-bs-primary-soft text-bs-primary border-blue-200",
  completed: "bg-bs-success-soft text-bs-success border-green-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  rejected: "bg-bs-danger-soft text-bs-danger border-red-200",
};

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const rows = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  const order = rows[0];
  if (!order) notFound();

  const s = await getSettings();
  const status = (order.status as OrderStatus) in ORDER_STATUS_LABELS ? (order.status as OrderStatus) : "pending";
  const paymentStatus = (order.paymentStatus as PaymentStatus) in PAYMENT_STATUS_LABELS
    ? (order.paymentStatus as PaymentStatus)
    : "unverified";

  const amount = taka(order.finalAmount ?? order.price);
  const waLink = buildWhatsAppLink(
    s.whatsappNumber,
    orderWhatsAppMessage({
      orderNumber: order.orderNumber ?? "",
      customerName: order.customerName,
      whatsapp: order.whatsapp,
      packageName: order.packageName,
      amount,
      paymentMethod: order.paymentMethod,
      transactionId: order.transactionId,
      statusLabel: ORDER_STATUS_LABELS[status],
    }),
  );

  const rowsSummary: [string, string][] = [
    ["Order ID", `#${order.orderNumber}`],
    ["Package", order.packageName],
    ["Amount", amount],
    ["Payment", order.paymentMethod],
    ["Transaction ID", order.transactionId],
    ["Status", ORDER_STATUS_LABELS[status]],
    ["Payment Status", PAYMENT_STATUS_LABELS[paymentStatus]],
    ["Placed", new Date(order.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })],
  ];

  return (
    <main className="flex min-h-screen items-start justify-center bg-bs-bg px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-bs-line bg-white p-6 text-center shadow-bs-card">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-bs-success-soft text-3xl">
            ✓
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-bs-ink">ORDER RECEIVED!</h1>
          <p className="mt-1 text-sm text-bs-muted">
            Thank you {order.customerName}. We&apos;ll contact you on WhatsApp shortly.
          </p>

          <div className="mt-5 divide-y divide-bs-line overflow-hidden rounded-xl border border-bs-line text-left">
            {rowsSummary.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-bs-muted">
                  {label}
                </span>
                <span className="max-w-[60%] truncate text-right text-sm font-bold text-bs-ink">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <span
            className={`mt-4 inline-block rounded-full border px-3 py-1 text-[11px] font-bold ${STATUS_STYLES[status]}`}
          >
            {ORDER_STATUS_LABELS[status]}
          </span>

          <div className="mt-6 flex flex-col gap-2">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-white transition hover:brightness-95"
            >
              Send on WhatsApp
            </a>
            <Link
              href="/orders"
              className="rounded-xl border border-bs-line px-5 py-3 text-sm font-bold text-bs-ink transition hover:border-bs-primary hover:text-bs-primary"
            >
              View All Orders
            </Link>
            <Link href="/" className="text-xs font-semibold text-bs-muted hover:text-bs-primary">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
