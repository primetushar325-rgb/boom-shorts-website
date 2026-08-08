"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, PageHeader, TextArea, TextInput, Toggle } from "@/components/admin/ui";
import { taka } from "@/lib/format";

type Pkg = {
  id: number;
  category: string;
  name: string;
  description: string;
  oldPrice: string | null;
  newPrice: string;
  badge: string;
  buttonText: string;
  icon: string;
  visible: boolean;
  recentlyAdded: boolean;
  sortOrder: number;
};

const emptyForm = {
  category: "boom",
  name: "",
  description: "",
  oldPrice: "",
  newPrice: "",
  badge: "none",
  buttonText: "Order Now",
  icon: "🎬",
  visible: true,
  recentlyAdded: false,
  sortOrder: 0,
};

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [tab, setTab] = useState<"boom" | "service">("boom");
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/packages");
    const data = await res.json();
    setPackages(data.packages || []);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(p: Pkg) {
    setEditingId(p.id);
    setForm({
      category: p.category,
      name: p.name,
      description: p.description,
      oldPrice: p.oldPrice || "",
      newPrice: p.newPrice,
      badge: p.badge,
      buttonText: p.buttonText,
      icon: p.icon,
      visible: p.visible,
      recentlyAdded: p.recentlyAdded,
      sortOrder: p.sortOrder,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, category: tab });
  }

  async function save() {
    setSaving(true);
    const payload = {
      ...form,
      oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
      newPrice: Number(form.newPrice || 0),
    };
    try {
      if (editingId) {
        await fetch(`/api/packages/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this package?")) return;
    await fetch(`/api/packages/${id}`, { method: "DELETE" });
    await load();
  }

  async function toggleVisible(p: Pkg) {
    await fetch(`/api/packages/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !p.visible }),
    });
    await load();
  }

  const filtered = packages.filter((p) => p.category === tab);

  return (
    <div>
      <PageHeader title="Packages" subtitle="Manage Boom Shorts & Other Services packages." />

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => {
            setTab("boom");
            resetForm();
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "boom" ? "bg-amber-500 text-white" : "bg-white/5 text-slate-300"}`}
        >
          🎬 Boom Shorts
        </button>
        <button
          onClick={() => {
            setTab("service");
            resetForm();
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "service" ? "bg-amber-500 text-white" : "bg-white/5 text-slate-300"}`}
        >
          🛠️ Other Services
        </button>
      </div>

      <Card className="mb-6">
        <p className="mb-4 font-bold text-white">{editingId ? "Edit Package" : "Add New Package"}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Icon (emoji)">
            <TextInput value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          </Field>
          <Field label="Old Price (৳) — optional">
            <TextInput
              type="number"
              value={form.oldPrice}
              onChange={(e) => setForm({ ...form, oldPrice: e.target.value })}
            />
          </Field>
          <Field label="New Price (৳)">
            <TextInput
              type="number"
              value={form.newPrice}
              onChange={(e) => setForm({ ...form, newPrice: e.target.value })}
            />
          </Field>
          <Field label="Badge">
            <select
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="none">None</option>
              <option value="popular">⭐ Popular</option>
              <option value="bestseller">🔥 Best Seller</option>
              <option value="new">✨ New</option>
            </select>
          </Field>
          <Field label="Button Text">
            <TextInput value={form.buttonText} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} />
          </Field>
          <Field label="Sort Order">
            <TextInput
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
            />
          </Field>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="boom">Boom Shorts</option>
              <option value="service">Other Services</option>
            </select>
          </Field>
          <Field label="Description">
            <TextArea
              rows={3}
              className="sm:col-span-2"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <Toggle checked={form.visible} onChange={(v) => setForm({ ...form, visible: v })} /> Visible
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <Toggle checked={form.recentlyAdded} onChange={(v) => setForm({ ...form, recentlyAdded: v })} /> Recently
            Added Badge
          </label>
        </div>

        <div className="mt-5 flex gap-3">
          <Button onClick={save} disabled={saving || !form.name || !form.newPrice}>
            {saving ? "Saving..." : editingId ? "Update Package" : "Add Package"}
          </Button>
          {editingId ? (
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.id} className={!p.visible ? "opacity-50" : ""}>
            <div className="flex items-start justify-between">
              <div className="text-3xl">{p.icon}</div>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <Toggle checked={p.visible} onChange={() => toggleVisible(p)} />
              </label>
            </div>
            <p className="mt-3 font-bold text-white">{p.name}</p>
            <div className="mt-1 flex items-center gap-2">
              {p.oldPrice ? <span className="text-xs text-slate-500 line-through">{taka(p.oldPrice)}</span> : null}
              <span className="font-extrabold text-amber-300">{taka(p.newPrice)}</span>
            </div>
            {p.badge !== "none" ? (
              <span className="mt-2 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-300">
                {p.badge}
              </span>
            ) : null}
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" onClick={() => startEdit(p)}>
                Edit
              </Button>
              <Button variant="danger" onClick={() => remove(p.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 ? <p className="text-sm text-slate-500">No packages yet.</p> : null}
      </div>
    </div>
  );
}
