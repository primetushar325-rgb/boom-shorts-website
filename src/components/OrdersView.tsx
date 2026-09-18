"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  buildWhatsAppLink,
  formatDateTime,
  orderStatusLabel,
  orderWhatsAppMessage,
  taka,
} from "@/lib/format";

export type OrderRow = {
  id: number;
  orderCode: string | null;
  packageName: string;
  packageQuantity: string;
  quantity: number;
  unitPrice?: string | null;
  originalPrice?: string | null;
  discountAmount?: string;
  couponCode?: string | null;
  couponDiscount?: string;
  price: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentNumber?: string;
  transactionId: string;
  createdAt: string;
};

/** Dark-theme status pills — the old light-theme tokens rendered as white
 *  boxes on the black admin/customer surfaces. */
export const STATUS_STYLES: Record<string, string> = {
  pending: "badge bg-gold-soft text-gold-light",
  payment_verified: "badge bg-gold-soft text-gold-light",
  processing: "badge bg-gold-soft text-gold-light",
  completed: "badge bg-ok-soft text-ok",
  cancelled: "badge bg-white/10 text-warm-dim",
  rejected: "badge bg-bad-soft text-bad",
};

const PAYMENT_STYLES: Record<string, string> = {
  pending: "badge bg-gold-soft text-gold-light",
  verified: "badge bg-ok-soft text-ok",
  rejected: "badge bg-bad-soft text-bad",
};

function statusClass(value: string): string {
  return STATUS_STYLES[value] ?? "badge bg-white/10 text-warm-dim";
}

export function OrderCard({ order, whatsappNumber }: { order: OrderRow; whatsappNumber: string }) {
  // Full click-to-chat message: everything the shop needs to verify the payment.
  const message = orderWhatsAppMessage({
    orderCode: order.orderCode,
    packageName: order.packageName,
    packageQuantity: order.packageQuantity,
    quantity: order.quantity,
    originalPrice: order.originalPrice,
    discount: order.discountAmount,
    couponCode: order.couponCode,
    couponDiscount: order.couponDiscount,
    amount: order.price,
    paymentMethod: order.paymentMethod,
    paymentNumber: order.paymentNumber,
    transactionId: order.transactionId,
  });

  return (
    <article className="card min-w-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-extrabold text-warm">
            {order.orderCode || `#${order.id}`}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-warm-dim">{order.packageName}</p>
        </div>
        <span className={statusClass(order.status)}>{orderStatusLabel(order.status)}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-3 text-[12px]">
        <Detail label="Quantity" value={String(order.quantity)} />
        <Detail label="Amount" value={taka(order.price)} strong />
        <Detail label="Payment" value={order.paymentMethod} />
        <Detail
          label="Payment status"
          value={
            <span className={PAYMENT_STYLES[order.paymentStatus] ?? "badge bg-white/10 text-warm-dim"}>
              {order.paymentStatus}
            </span>
          }
        />
        <Detail label="Transaction" value={order.transactionId} />
        <Detail label="Date" value={formatDateTime(order.createdAt)} />
      </div>

      <a
        href={buildWhatsAppLink(whatsappNumber, message)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-whatsapp mt-3 w-full py-2.5 text-xs"
      >
        <MessageCircle size={15} aria-hidden />
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
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">{label}</p>
      <p
        className={`mt-0.5 truncate ${strong ? "font-extrabold text-warm" : "font-semibold text-warm-dim"}`}
      >
        {value}
      </p>
    </div>
  );
}

/** Reads JSON, or explains a non-JSON (gateway) response honestly. */
async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return { error: `Server responded with ${res.status}. Please try again.` };
  }
}

export default function OrdersView({ whatsappNumber }: { whatsappNumber: string }) {
  const [customer, setCustomer] = useState<{ id: number; name: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tab, setTab] = useState<"mine" | "track">("mine");

  const [trackCode, setTrackCode] = useState("");
  const [trackPhone, setTrackPhone] = useState("");
  const [trackError, setTrackError] = useState("");
  const [trackResult, setTrackResult] = useState<OrderRow | null>(null);
  const [tracking, setTracking] = useState(false);
  const trackingInFlight = useRef(false);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/customer/orders", { cache: "no-store" });
      if (res.ok) {
        const data = await readJson(res);
        setOrders((data.orders as OrderRow[]) ?? []);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    }
  }, []);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/customer/me", { cache: "no-store" });
      const data = await readJson(res);
      if (!res.ok) {
        setCustomer(null);
        setLoadError("Could not load your session. Showing guest tracking instead.");
        setTab("track");
        return;
      }
      if (data.customer) {
        setCustomer(data.customer as { id: number; name: string; phone: string });
        await loadOrders();
      } else {
        setTab("track");
      }
    } catch {
      setCustomer(null);
      setLoadError("Network problem while loading your orders. Please try again.");
      setTab("track");
    } finally {
      setLoading(false);
    }
  }, [loadOrders]);

  useEffect(() => {
    // Deferred to a microtask so the fetch (and its state updates) never runs
    // synchronously inside the effect body.
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadSession();
    });
    return () => {
      active = false;
    };
  }, [loadSession]);

  async function track(event: React.FormEvent) {
    event.preventDefault();
    if (trackingInFlight.current) return;
    setTrackError("");
    setTrackResult(null);
    trackingInFlight.current = true;
    setTracking(true);
    try {
      const res = await fetch("/api/customer/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCode: trackCode, phone: trackPhone }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        const message = typeof data.error === "string" && data.error.trim() ? data.error : "";
        setTrackError(
          message || `We could not look up that order (error ${res.status}). Please try again.`,
        );
        return;
      }
      setTrackResult((data.order as OrderRow) ?? null);
    } catch {
      setTrackError(
        "Network problem — the request did not reach our server. Please check your connection.",
      );
    } finally {
      trackingInFlight.current = false;
      setTracking(false);
    }
  }

  if (loading) {
    return (
      <div className="card flex items-center justify-center gap-2 p-6 text-sm text-muted-2">
        <Loader2 size={16} className="animate-spin" aria-hidden />
        Loading your orders…
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("mine")}
          aria-pressed={tab === "mine"}
          className={`chip flex-1 justify-center ${tab === "mine" ? "chip-active" : ""}`}
        >
          My orders
        </button>
        <button
          type="button"
          onClick={() => setTab("track")}
          aria-pressed={tab === "track"}
          className={`chip flex-1 justify-center ${tab === "track" ? "chip-active" : ""}`}
        >
          Track an order
        </button>
      </div>

      {loadError ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-bad-soft px-3 py-2">
          <p className="min-w-0 text-xs font-semibold text-bad">{loadError}</p>
          <button
            type="button"
            onClick={loadSession}
            className="btn-ghost shrink-0 px-3 py-1.5 text-[11px]"
          >
            <RefreshCw size={12} aria-hidden />
            Retry
          </button>
        </div>
      ) : null}

      {tab === "mine" ? (
        customer ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-xs text-muted">
                Signed in as <span className="font-bold text-warm-dim">{customer.phone}</span>
              </p>
              <button
                type="button"
                onClick={() => void loadOrders()}
                className="flex shrink-0 items-center gap-1 text-xs font-bold text-gold"
              >
                <RefreshCw size={12} aria-hidden />
                Refresh
              </button>
            </div>
            {orders.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-sm text-muted">You have no orders yet.</p>
                <Link href="/#boom-shorts" className="btn-primary mt-3 px-4 py-2 text-xs">
                  Browse packages
                  <ArrowRight size={13} aria-hidden />
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
            <p className="text-sm font-semibold text-warm">Sign in to see your order history</p>
            <p className="mt-1 text-xs text-muted">
              Use the WhatsApp number and PIN you set while ordering.
            </p>
            <Link href="/profile" className="btn-primary mt-3 px-4 py-2.5 text-xs">
              Sign in / create account
            </Link>
          </div>
        )
      ) : (
        <>
          <form onSubmit={track} className="card flex min-w-0 flex-col gap-3 p-4">
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
                autoComplete="off"
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
                autoComplete="tel"
                required
              />
            </div>
            {trackError ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-bad-soft px-3 py-2 text-xs font-semibold text-bad"
              >
                <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
                {trackError}
              </p>
            ) : null}
            <button type="submit" disabled={tracking} aria-busy={tracking} className="btn-primary w-full py-3">
              {tracking ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : (
                <Search size={15} aria-hidden />
              )}
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
