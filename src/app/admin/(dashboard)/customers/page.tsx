"use client";

import { useCallback, useEffect, useState } from "react";
import { taka } from "@/lib/pricing";

type Customer = {
  id: number;
  name: string;
  whatsapp: string;
  email: string | null;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
};

export default function AdminCustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (query.trim()) params.set("q", query.trim());
    return `/api/customers?${params.toString()}`;
  }, [page, query]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (query.trim()) params.set("q", query.trim());
    const res = await fetch(`/api/customers?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.customers ?? []);
      setTotalPages(data.totalPages ?? 1);
    }
    setLoading(false);
  }, [page, query]);

  useEffect(() => {
    // Fetch inside the effect body: the rule rejects setState called
    // synchronously from an effect, and `load()` does that for its spinner.
    let cancelled = false;
    void (async () => {
      const res = await fetch(buildUrl());
      const d = res.ok ? await res.json() : null;
      if (cancelled) return;
      setRows(d?.customers ?? []);

      if (!cancelled) setTotalPages(d?.totalPages ?? 1);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [buildUrl, load]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-white">Customers</h1>
        <p className="mt-0.5 text-xs text-slate-400">Everyone who has placed an order.</p>
      </div>

      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setPage(1); }}
        placeholder="Search name or WhatsApp number"
        className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-bs-primary"
      />

      {loading ? (
        <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="bs-skeleton h-16 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0e1628] px-4 py-12 text-center">
          <p className="text-2xl">👥</p>
          <p className="mt-2 text-sm font-bold text-white">No customers yet</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0e1628] p-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{c.name}</p>
                <p className="truncate text-[11px] text-slate-400">{c.whatsapp}{c.email ? ` · ${c.email}` : ""}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-extrabold text-white">{taka(c.totalSpent)}</p>
                <p className="text-[11px] text-slate-400">{c.totalOrders} order{c.totalOrders === 1 ? "" : "s"}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">← Prev</button>
          <span className="text-xs text-slate-400">Page {page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Next →</button>
        </div>
      ) : null}
    </div>
  );
}
