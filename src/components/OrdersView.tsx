"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { buildWhatsAppLink, formatDateTime, orderStatusLabel, orderWhatsAppMessage, taka } from "@/lib/format";

export type OrderRow = {
  id: number;
  orderCode: string | null;
  packageName: string;
  packageQuantity: string;
  quantity: number;
  price: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  transactionId: string;
  createdAt: string;
};

export const STATUS_STYLES: Record<string, string> = {
  pending: "badge bg-amber-100 text-amber-800",
  payment_verified: "badge bg-blue-100 text-blue-700",
  processing: "badge bg-indigo-100 text-indigo-700",
  completed: "badge bg-emerald-100 text-emerald-700",
  cancelled: "badge bg-slate-200 text-slate-600",
  rejected: "badge bg-red-100 text-red-700",
};

const PAYMENT_STYLES: Record<string, string> = {
  pending: "badge bg-amber-100 text-amber-800",
  verified: "badge bg-emerald-100 text-emerald-700",
  rejected: "badge bg-red-100 text-red-700",
};

export function OrderCard({ order, whatsappNumber }: { order: OrderRow; whatsappNumber: string }) {
  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-extrabold text-navy">
            {order.orderCode || `#${order.id}`}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-slate-600">{order.packageName}</p>
        </div>
        <span className={STATUS_STYLES[order.status] ?? "badge-neutral"}>
          {orderStatusLabel(order.status)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-[12px]">
        <Detail label="Quantity" value={String(order.quantity)} />
        <Detail label="Amount" value={taka(order.price)} strong />
        <Detail label="Payment" value={order.paymentMethod} />
        <Detail
          label="Payment status"
          value={
            <span className={PAYMENT_STYLES[order.paymentStatus] ?? "badge-neutral"}>
              {order.paymentStatus}
            </span>
          }
        />
        <Detail label="Transaction" value={order.transactionId} />
        <Detail label="Date" value={formatDateTime(order.createdAt)} />
      </div>

      <a
        href={buildWhatsAppLink(
          whatsappNumber,
          orderWhatsAppMessage({
            orderCode: order.orderCode,
            packageName: order.packageName,
            quantity: order.quantity,
            amount: order.price,
            paymentMethod: order.paymentMethod,
            transactionId: order.transactionId,
          }),
        )}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-whatsapp mt-3 w-full py-2.5 text-xs"
      >
        Chat on WhatsApp about this order
      </a>
    </article>
  );
}

function Detail({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 ${strong ? "font-extrabold text-navy" : "font-semibold text-slate-700"}`}>
        {value}
      </p>
    </div>
  );
}

export default function OrdersView({ whatsappNumber }: { whatsappNumber: string }) {
  const [customer, setCustomer] = useState<{ id: number; name: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tab, setTab] = useState<"mine" | "track">("mine");

  const [trackCode, setTrackCode] = useState("");
  const [trackPhone, setTrackPhone] = useState("");
  const [trackError, setTrackError] = useState("");
  const [trackResult, setTrackResult] = useState<OrderRow | null>(null);
  const [tracking, setTracking] = useState(false);

  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/customer/orders", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders ?? []);
    } else {
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/customer/me", { cache: "no-store" });
        const data = await res.json();
        if (data.customer) {
          setCustomer(data.customer);
          await loadOrders();
        } else {
          setTab("track");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [loadOrders]);

  async function track(event: React.FormEvent) {
    event.preventDefault();
    setTrackError("");
    setTrackResult(null);
    setTracking(true);
    try {
      const res = await fetch("/api/customer/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCode: trackCode, phone: trackPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTrackError(data.error || "Order not found. Please check the details.");
        return;
      }
      setTrackResult(data.order);
    } catch {
      setTrackError("Network problem. Please try again.");
    } finally {
      setTracking(false);
    }
  }

  if (loading) {
    return <div className="card p-6 text-center text-sm text-slate-400">Loading your orders…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={`chip flex-1 justify-center ${tab === "mine" ? "chip-active" : ""}`}
        >
          My orders
        </button>
        <button
          type="button"
          onClick={() => setTab("track")}
          className={`chip flex-1 justify-center ${tab === "track" ? "chip-active" : ""}`}
        >
          Track an order
        </button>
      </div>

      {tab === "mine" ? (
        customer ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Signed in as <span className="font-bold text-slate-700">{customer.phone}</span>
              </p>
              <button type="button" onClick={loadOrders} className="text-xs font-bold text-blue-600">
                Refresh
              </button>
            </div>
            {orders.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-sm text-slate-500">You have no orders yet.</p>
                <Link href="/#boom-shorts" className="btn-primary mt-3 px-4 py-2 text-xs">
                  Browse packages
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} whatsappNumber={whatsappNumber} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="card p-5 text-center">
            <p className="text-sm font-semibold text-navy">Sign in to see your order history</p>
            <p className="mt-1 text-xs text-slate-500">
              Use the WhatsApp number and PIN you set while ordering.
            </p>
            <Link href="/profile" className="btn-primary mt-3 px-4 py-2.5 text-xs">
              Sign in / create account
            </Link>
          </div>
        )
      ) : (
        <>
          <form onSubmit={track} className="card flex flex-col gap-3 p-4">
            <div>
              <label className="label" htmlFor="track-code">
                Order ID
              </label>
              <input
                id="track-code"
                className="input"
                value={trackCode}
                onChange={(event) => setTrackCode(event.target.value.toUpperCase())}
                placeholder="BS-XXXXXX"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="track-phone">
                WhatsApp number used in the order
              </label>
              <input
                id="track-phone"
                className="input"
                value={trackPhone}
                onChange={(event) => setTrackPhone(event.target.value)}
                placeholder="01XXXXXXXXX"
                inputMode="tel"
                required
              />
            </div>
            {trackError ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                {trackError}
              </p>
            ) : null}
            <button type="submit" disabled={tracking} className="btn-primary w-full">
              {tracking ? "Searching…" : "Track order"}
            </button>
          </form>

          {trackResult ? (
            <OrderCard order={trackResult} whatsappNumber={whatsappNumber} />
          ) : null}
        </>
      )}
    </div>
  );
}
