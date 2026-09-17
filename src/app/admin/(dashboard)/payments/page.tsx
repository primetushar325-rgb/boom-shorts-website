"use client";

import { useEffect, useState } from "react";
import { taka } from "@/lib/pricing";
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/lib/orderStatus";

type Payment = {
  id: number;
  orderId: number;
  orderNumber: string | null;
  customerName: string;
  method: string;
  transactionId: string;
  senderNumber: string;
  amount: string;
  status: string;
  screenshotPath: string;
  verifiedAt: string | null;
  createdAt: string;
};

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/payments")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setRows(d?.payments ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function setStatus(p: Payment, status: PaymentStatus) {
    setMessage("");
    const res = await fetch(`/api/payments/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Could not update that payment.");
      return;
    }
    setRows((l) => l.map((r) => (r.id === p.id ? { ...r, status } : r)));
    setMessage("✓ Payment updated");
  }

  const unverified = rows.filter((r) => r.status === "unverified");
  const rest = rows.filter((r) => r.status !== "unverified");

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-white">Payments</h1>
        <p className="mt-0.5 text-xs text-slate-400">
          {unverified.length} awaiting verification.
        </p>
      </div>

      {message ? <p className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-200">{message}</p> : null}

      {loading ? (
        <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="bs-skeleton h-16 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0e1628] px-4 py-12 text-center">
          <p className="text-2xl">💳</p>
          <p className="mt-2 text-sm font-bold text-white">No payments recorded</p>
        </div>
      ) : (
        <>
          {[...unverified, ...rest].map((p) => (
            <div key={p.id} className="mb-2 rounded-2xl border border-white/10 bg-[#0e1628] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-bs-primary">#{p.orderNumber}</p>
                  <p className="truncate text-sm font-bold text-white">{p.customerName}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {p.method} · TrxID {p.transactionId}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-extrabold text-white">{taka(p.amount)}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    p.status === "confirmed" ? "bg-emerald-500/15 text-emerald-300"
                    : p.status === "rejected" ? "bg-red-500/15 text-red-300"
                    : "bg-amber-500/15 text-amber-300"
                  }`}>
                    {PAYMENT_STATUS_LABELS[p.status as PaymentStatus] ?? p.status}
                  </span>
                </div>
              </div>

              {p.status === "unverified" ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setStatus(p, "confirmed")} className="rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white">
                    ✓ Confirm
                  </button>
                  <button type="button" onClick={() => setStatus(p, "rejected")} className="rounded-xl bg-red-600 px-3 py-2.5 text-xs font-bold text-white">
                    ✕ Reject
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
