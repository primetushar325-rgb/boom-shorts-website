"use client";

import { useCallback, useEffect, useState } from "react";
import { taka } from "@/lib/pricing";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orderStatus";

type Order = {
  id: number;
  orderNumber: string | null;
  customerName: string;
  whatsapp: string;
  packageName: string;
  finalAmount: string | null;
  price: string;
  paymentMethod: string;
  transactionId: string;
  screenshotUrl: string;
  status: string;
  paymentStatus: string;
  adminNote: string;
  couponCode: string | null;
  createdAt: string;
};

const STATUS_PILL: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  confirmed: "bg-blue-500/15 text-blue-300",
  processing: "bg-blue-500/15 text-blue-300",
  completed: "bg-emerald-500/15 text-emerald-300",
  cancelled: "bg-slate-500/15 text-slate-300",
  rejected: "bg-red-500/15 text-red-300",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [open, setOpen] = useState<Order | null>(null);
  const [note, setNote] = useState("");
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (status !== "all") params.set("status", status);
    if (query.trim()) params.set("q", query.trim());
    return `/api/orders?${params.toString()}`;
  }, [page, status, query]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (status !== "all") params.set("status", status);
    if (query.trim()) params.set("q", query.trim());
    const res = await fetch(`/api/orders?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders ?? []);
      setTotalPages(data.totalPages ?? 1);
    }
    setLoading(false);
  }, [page, status, query]);

  useEffect(() => {
    // Fetch inside the effect body: the rule rejects setState called
    // synchronously from an effect, and `load()` does that for its spinner.
    let cancelled = false;
    void (async () => {
      const res = await fetch(buildUrl());
      const d = res.ok ? await res.json() : null;
      if (cancelled) return;
      setOrders(d?.orders ?? []);

      if (!cancelled) setTotalPages(d?.totalPages ?? 1);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [buildUrl, load]);

  function openOrder(o: Order) {
    setOpen(o);
    setNote(o.adminNote ?? "");
    setShotUrl(null);
    setMessage("");
    if (o.screenshotUrl) {
      // Resolve a short-lived signed URL for private Supabase storage.
      fetch(`/api/payments/screenshot?path=${encodeURIComponent(o.screenshotUrl)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setShotUrl(d?.url ?? null))
        .catch(() => setShotUrl(null));
    }
  }

  async function update(patch: { status?: OrderStatus; paymentStatus?: PaymentStatus; adminNote?: string }) {
    if (!open) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/orders/${open.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setMessage("✓ Saved");
      setOpen(null);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-white">Orders</h1>
        <p className="mt-0.5 text-xs text-slate-400">Verify payments and update order status.</p>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search order ID, name, phone, TrxID"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-bs-primary"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-white/10 bg-[#0e1628] px-3 py-2.5 text-sm text-white outline-none focus:border-bs-primary"
        >
          <option value="all">All statuses</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="bs-skeleton h-20 rounded-2xl" />)}</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0e1628] px-4 py-12 text-center">
          <p className="text-2xl">🧾</p>
          <p className="mt-2 text-sm font-bold text-white">No orders found</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => openOrder(o)}
                className="w-full rounded-2xl border border-white/10 bg-[#0e1628] p-3.5 text-left transition hover:border-bs-primary/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-bs-primary">#{o.orderNumber}</p>
                    <p className="truncate text-sm font-bold text-white">{o.customerName}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {o.packageName} · {o.paymentMethod}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-extrabold text-white">{taka(o.finalAmount ?? o.price)}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_PILL[o.status] ?? ""}`}>
                      {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
            ← Prev
          </button>
          <span className="text-xs text-slate-400">Page {page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
            Next →
          </button>
        </div>
      ) : null}

      {/* ---------- order detail sheet ---------- */}
      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-[#0e1628] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-bs-primary">#{open.orderNumber}</p>
                <h2 className="text-base font-extrabold text-white">{open.customerName}</h2>
              </div>
              <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300">
                ✕
              </button>
            </div>

            <dl className="mt-4 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
              {[
                ["Package", open.packageName],
                ["Amount", taka(open.finalAmount ?? open.price)],
                ["Payment", open.paymentMethod],
                ["Transaction ID", open.transactionId],
                ["WhatsApp", open.whatsapp],
                ["Coupon", open.couponCode ?? "—"],
                ["Payment Status", PAYMENT_STATUS_LABELS[open.paymentStatus as PaymentStatus] ?? open.paymentStatus],
                ["Date", new Date(open.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                  <dd className="max-w-[60%] truncate text-right text-sm font-bold text-white">{value}</dd>
                </div>
              ))}
            </dl>

            {open.screenshotUrl ? (
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Payment Screenshot
                </p>
                {shotUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shotUrl} alt="Payment screenshot" className="max-h-72 w-full rounded-2xl border border-white/10 object-contain" />
                ) : (
                  <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-6 text-center text-xs text-slate-400">
                    Screenshot stored but not viewable. Configure Supabase Storage credentials to
                    generate a signed link.
                  </p>
                )}
              </div>
            ) : null}

            <div className="mt-4">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Internal Note (never shown to customers)
              </p>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-bs-primary"
              />
            </div>

            {message ? <p className="mt-3 text-xs font-semibold text-emerald-300">{message}</p> : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => update({ paymentStatus: "confirmed", status: "confirmed", adminNote: note })} className="rounded-xl bg-emerald-600 px-3 py-3 text-xs font-bold text-white disabled:opacity-60">
                ✓ Confirm Payment
              </button>
              <button type="button" disabled={busy} onClick={() => update({ paymentStatus: "rejected", status: "rejected", adminNote: note })} className="rounded-xl bg-red-600 px-3 py-3 text-xs font-bold text-white disabled:opacity-60">
                ✕ Reject
              </button>
              <button type="button" disabled={busy} onClick={() => update({ status: "processing", adminNote: note })} className="rounded-xl border border-white/10 px-3 py-3 text-xs font-bold text-white disabled:opacity-60">
                Processing
              </button>
              <button type="button" disabled={busy} onClick={() => update({ status: "completed", adminNote: note })} className="rounded-xl bg-bs-primary px-3 py-3 text-xs font-bold text-white disabled:opacity-60">
                Completed
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
