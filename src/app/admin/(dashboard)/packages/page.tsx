"use client";

import { useCallback, useEffect, useState } from "react";

type Pkg = {
  id: number;
  name: string;
  category: string;
  description: string;
  shortDescription: string;
  durationLabel: string;
  videoQuantity: number;
  youtubeDemoUrl: string;
  oldPrice: string | null;
  newPrice: string;
  discountPercent: number;
  discountAmount: string;
  isBestSeller: boolean;
  visible: boolean;
  available: boolean;
  sortOrder: number;
  features: string[];
};

const EMPTY = {
  name: "",
  description: "",
  shortDescription: "",
  durationLabel: "",
  videoQuantity: 0,
  youtubeDemoUrl: "",
  oldPrice: "",
  newPrice: "",
  discountPercent: 0,
  discountAmount: "",
  isBestSeller: false,
  visible: true,
  available: true,
  features: [] as string[],
};

export default function AdminPackagesPage() {
  const [list, setList] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [featureDraft, setFeatureDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const buildUrl = useCallback(() => "/api/packages?all=1", []);

  const load = useCallback(async () => {
    const res = await fetch("/api/packages?all=1");
    const data = await res.json();
    setList(data.packages ?? []);
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
      setList(d?.packages ?? []);

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [buildUrl, load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY });
    setCreating(true);
    setMessage("");
  }

  function openEdit(pkg: Pkg) {
    setCreating(false);
    setEditing(pkg);
    setForm({
      name: pkg.name,
      description: pkg.description,
      shortDescription: pkg.shortDescription,
      durationLabel: pkg.durationLabel,
      videoQuantity: pkg.videoQuantity,
      youtubeDemoUrl: pkg.youtubeDemoUrl,
      oldPrice: pkg.oldPrice ?? "",
      newPrice: pkg.newPrice,
      discountPercent: pkg.discountPercent,
      discountAmount: pkg.discountAmount,
      isBestSeller: pkg.isBestSeller,
      visible: pkg.visible,
      available: pkg.available,
      features: [...pkg.features],
    });
    setMessage("");
  }

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addFeature() {
    const label = featureDraft.trim();
    if (!label || form.features.length >= 12) return;
    set("features", [...form.features, label]);
    setFeatureDraft("");
  }

  async function save() {
    if (!form.name.trim()) return setMessage("Package name is required.");
    if (!form.newPrice || Number(form.newPrice) <= 0) return setMessage("A price greater than 0 is required.");

    setSaving(true);
    setMessage("");
    try {
      const payload = {
        ...form,
        videoQuantity: Number(form.videoQuantity) || 0,
        discountPercent: Number(form.discountPercent) || 0,
      };
      const res = await fetch(editing ? `/api/packages/${editing.id}` : "/api/packages", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage("✓ Saved. The customer website reflects this immediately.");
      setEditing(null);
      setCreating(false);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function quickToggle(pkg: Pkg, key: "visible" | "available" | "isBestSeller") {
    const next = !pkg[key];
    setList((l) => l.map((p) => (p.id === pkg.id ? { ...p, [key]: next } : p)));
    const res = await fetch(`/api/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next }),
    });
    if (!res.ok) {
      setList((l) => l.map((p) => (p.id === pkg.id ? { ...p, [key]: pkg[key] } : p)));
      setMessage("Could not save that change.");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
    await fetch("/api/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((p) => p.id) }),
    });
  }

  async function archive(pkg: Pkg) {
    if (!confirm(`Archive "${pkg.name}"? It will disappear from the website but orders are kept.`)) return;
    await fetch(`/api/packages/${pkg.id}`, { method: "DELETE" });
    await load();
  }

  const editorOpen = creating || editing !== null;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-white">Packages</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Order here = order on the website. Use ▲▼ to reorder.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 rounded-xl bg-bs-primary px-4 py-2.5 text-sm font-bold text-white"
        >
          + New
        </button>
      </div>

      {message ? (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-200">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bs-skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0e1628] px-4 py-12 text-center">
          <p className="text-2xl">📦</p>
          <p className="mt-2 text-sm font-bold text-white">No packages yet</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 rounded-xl bg-bs-primary px-4 py-2 text-xs font-bold text-white"
          >
            Create your first package
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((pkg, index) => (
            <li key={pkg.id} className="rounded-2xl border border-white/10 bg-[#0e1628] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{pkg.name}</p>
                  <p className="text-[11px] text-slate-400">
                    ৳{pkg.newPrice}
                    {pkg.durationLabel ? ` · ${pkg.durationLabel}` : ""}
                    {pkg.videoQuantity ? ` · ${pkg.videoQuantity} videos` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="rounded-lg border border-white/10 px-2 text-xs text-slate-300 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === list.length - 1}
                    aria-label="Move down"
                    className="rounded-lg border border-white/10 px-2 text-xs text-slate-300 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <ToggleChip on={pkg.visible} label="Homepage" onClick={() => quickToggle(pkg, "visible")} />
                <ToggleChip on={pkg.available} label="Available" onClick={() => quickToggle(pkg, "available")} />
                <ToggleChip on={pkg.isBestSeller} label="Best Seller" onClick={() => quickToggle(pkg, "isBestSeller")} />
                {pkg.youtubeDemoUrl ? (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                    🎬 Demo
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(pkg)}
                  className="flex-1 rounded-xl bg-bs-primary px-3 py-2 text-xs font-bold text-white"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => archive(pkg)}
                  className="rounded-xl border border-red-400/30 px-3 py-2 text-xs font-bold text-red-300"
                >
                  Archive
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ---------- editor ---------- */}
      {editorOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4" onClick={(e) => { if (e.target === e.currentTarget) { setCreating(false); setEditing(null); } }}>
          <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-[#0e1628] p-5">
            <h2 className="text-base font-extrabold text-white">
              {editing ? "Edit Package" : "New Package"}
            </h2>

            <div className="mt-4 space-y-3">
              <AdminField label="Package Name *">
                <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
              </AdminField>

              <div className="grid grid-cols-2 gap-3">
                <AdminField label="Duration Label">
                  <input value={form.durationLabel} onChange={(e) => set("durationLabel", e.target.value)} placeholder="7 Days" className={inputCls} />
                </AdminField>
                <AdminField label="Video Quantity">
                  <input type="number" min={0} value={form.videoQuantity} onChange={(e) => set("videoQuantity", Number(e.target.value))} className={inputCls} />
                </AdminField>
              </div>

              <AdminField label="Short Description (card)">
                <input value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} className={inputCls} />
              </AdminField>

              <AdminField label="Full Description">
                <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className={inputCls} />
              </AdminField>

              <AdminField label="YouTube Demo URL">
                <input value={form.youtubeDemoUrl} onChange={(e) => set("youtubeDemoUrl", e.target.value)} placeholder="https://youtu.be/…" className={inputCls} />
              </AdminField>

              <div className="grid grid-cols-3 gap-3">
                <AdminField label="Price *">
                  <input type="number" min={0} value={form.newPrice} onChange={(e) => set("newPrice", e.target.value)} className={inputCls} />
                </AdminField>
                <AdminField label="Discount %">
                  <input type="number" min={0} max={100} value={form.discountPercent} onChange={(e) => set("discountPercent", Number(e.target.value))} className={inputCls} />
                </AdminField>
                <AdminField label="Discount ৳">
                  <input type="number" min={0} value={form.discountAmount} onChange={(e) => set("discountAmount", e.target.value)} className={inputCls} />
                </AdminField>
              </div>

              <AdminField label="Features (3–5 recommended)">
                <div className="flex gap-2">
                  <input
                    value={featureDraft}
                    onChange={(e) => setFeatureDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                    placeholder="High Quality"
                    className={inputCls}
                  />
                  <button type="button" onClick={addFeature} className="shrink-0 rounded-xl border border-white/10 px-3 text-xs font-bold text-white">
                    Add
                  </button>
                </div>
                {form.features.length ? (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {form.features.map((f, i) => (
                      <li key={`${f}-${i}`} className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                        ✓ {f}
                        <button
                          type="button"
                          onClick={() => set("features", form.features.filter((_, idx) => idx !== i))}
                          aria-label={`Remove ${f}`}
                          className="text-slate-500 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </AdminField>

              <div className="grid grid-cols-3 gap-2">
                <ToggleChip on={form.available} label="Available" onClick={() => set("available", !form.available)} />
                <ToggleChip on={form.visible} label="Homepage" onClick={() => set("visible", !form.visible)} />
                <ToggleChip on={form.isBestSeller} label="Best Seller" onClick={() => set("isBestSeller", !form.isBestSeller)} />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-xl bg-bs-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Package"}
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setEditing(null); }}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-bs-primary";

function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function ToggleChip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
        on ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-slate-500"
      }`}
    >
      {on ? "●" : "○"} {label}
    </button>
  );
}
