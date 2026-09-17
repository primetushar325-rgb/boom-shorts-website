"use client";

import { useCallback, useEffect, useState } from "react";

type Review = {
  id: number;
  name: string;
  message: string;
  rating: number;
  approved: boolean;
  visible: boolean;
  createdAt: string;
};

export default function AdminReviewsPage() {
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const buildUrl = useCallback(() => "/api/reviews?all=1", []);

  const load = useCallback(async () => {
    const res = await fetch("/api/reviews?all=1");
    if (res.ok) {
      const data = await res.json();
      setRows(data.reviews ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Fetch inside the effect body: the rule rejects setState called
    // synchronously from an effect, and `load()` does that for its spinner.
    let cancelled = false;
    void (async () => {
      const res = await fetch(buildUrl());
      const d = res.ok ? await res.json() : null;
      if (cancelled) return;
      setRows(d?.reviews ?? []);

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [buildUrl, load]);

  async function patch(id: number, body: Partial<Review>) {
    setMessage("");
    setRows((l) => l.map((r) => (r.id === id ? { ...r, ...body } : r)));
    const res = await fetch(`/api/testimonials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setMessage("Could not save that change.");
      await load();
      return;
    }
    setMessage("✓ Saved");
  }

  async function remove(id: number) {
    if (!confirm("Delete this review permanently?")) return;
    await fetch(`/api/testimonials/${id}`, { method: "DELETE" });
    setRows((l) => l.filter((r) => r.id !== id));
  }

  const pending = rows.filter((r) => !r.approved);
  const approved = rows.filter((r) => r.approved);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-white">Reviews</h1>
        <p className="mt-0.5 text-xs text-slate-400">
          Only approved and visible reviews appear on the website. {pending.length} pending.
        </p>
      </div>

      {message ? (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-200">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="bs-skeleton h-20 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0e1628] px-4 py-12 text-center">
          <p className="text-2xl">⭐</p>
          <p className="mt-2 text-sm font-bold text-white">No reviews yet</p>
        </div>
      ) : (
        <>
          {pending.length ? (
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-300">
              Awaiting approval
            </h2>
          ) : null}
          {[...pending, ...approved].map((r) => (
            <div key={r.id} className="mb-2 rounded-2xl border border-white/10 bg-[#0e1628] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{r.name}</p>
                  <p className="text-[11px] text-bs-gold">{"★".repeat(r.rating)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${r.approved ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                  {r.approved ? "Approved" : "Pending"}
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-slate-300">{r.message}</p>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => patch(r.id, { approved: !r.approved })}
                  className={`rounded-xl px-2 py-2 text-[11px] font-bold ${r.approved ? "border border-white/10 text-slate-300" : "bg-emerald-600 text-white"}`}
                >
                  {r.approved ? "Unapprove" : "✓ Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => patch(r.id, { visible: !r.visible })}
                  className="rounded-xl border border-white/10 px-2 py-2 text-[11px] font-bold text-slate-300"
                >
                  {r.visible ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="rounded-xl border border-red-400/30 px-2 py-2 text-[11px] font-bold text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
