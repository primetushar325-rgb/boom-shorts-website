"use client";

import { useEffect, useState } from "react";
import { extractYouTubeId } from "@/lib/youtube";

type Pkg = {
  id: number;
  name: string;
  durationLabel: string;
  youtubeDemoUrl: string;
};

/**
 * Product Videos — a focused editor for the per-package YouTube demo URL.
 * The same field exists in the full package editor; this view makes it fast to
 * set or replace a demo across every package in one sitting.
 */
export default function AdminProductVideosPage() {
  const [list, setList] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/packages?all=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const pkgs: Pkg[] = d?.packages ?? [];
        setList(pkgs);
        setDrafts(Object.fromEntries(pkgs.map((p) => [p.id, p.youtubeDemoUrl])));
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(pkg: Pkg) {
    const url = (drafts[pkg.id] ?? "").trim();
    if (url && !extractYouTubeId(url)) {
      setMessage(`"${url}" does not look like a YouTube link.`);
      return;
    }
    setSavingId(pkg.id);
    setMessage("");
    const res = await fetch(`/api/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ youtubeDemoUrl: url }),
    });
    setSavingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Could not save that video.");
      return;
    }
    setList((l) => l.map((p) => (p.id === pkg.id ? { ...p, youtubeDemoUrl: url } : p)));
    setMessage(`✓ Saved demo for "${pkg.name}"`);
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-white">Product Videos</h1>
        <p className="mt-0.5 text-xs text-slate-400">
          Paste any YouTube link — watch, youtu.be, shorts or embed. The ID is extracted
          automatically and shown as a 16:9 embed at checkout.
        </p>
      </div>

      {message ? (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-200">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="bs-skeleton h-24 rounded-2xl" />)}</div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0e1628] px-4 py-12 text-center">
          <p className="text-2xl">🎬</p>
          <p className="mt-2 text-sm font-bold text-white">No packages yet</p>
          <p className="mt-1 text-xs text-slate-400">Create a package first, then add its demo video.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((pkg) => {
            const id = extractYouTubeId(drafts[pkg.id] ?? "");
            const dirty = (drafts[pkg.id] ?? "") !== pkg.youtubeDemoUrl;
            return (
              <li key={pkg.id} className="rounded-2xl border border-white/10 bg-[#0e1628] p-4">
                <p className="truncate text-sm font-bold text-white">{pkg.name}</p>
                {pkg.durationLabel ? (
                  <p className="text-[11px] text-slate-400">{pkg.durationLabel}</p>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <input
                    value={drafts[pkg.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [pkg.id]: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=…"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-bs-primary"
                  />
                  <button
                    type="button"
                    onClick={() => save(pkg)}
                    disabled={!dirty || savingId === pkg.id}
                    className="shrink-0 rounded-xl bg-bs-primary px-4 text-xs font-bold text-white disabled:opacity-40"
                  >
                    {savingId === pkg.id ? "…" : "Save"}
                  </button>
                </div>

                {id ? (
                  <p className="mt-2 text-[11px] font-semibold text-emerald-300">
                    ✓ Video ID detected: {id}
                  </p>
                ) : (drafts[pkg.id] ?? "").trim() ? (
                  <p className="mt-2 text-[11px] font-semibold text-amber-300">
                    ⚠ No YouTube ID found in that link
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-500">No demo video set</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
