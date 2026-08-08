"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, PageHeader, TextArea, TextInput, Toggle } from "@/components/admin/ui";

type SectionItem = {
  title?: string;
  description?: string;
  imageUrl?: string;
  link?: string;
  price?: string;
  buttonText?: string;
};

type Section = {
  id: number;
  title: string;
  subtitle: string;
  videoUrl: string;
  videoThumbnailUrl: string;
  items: SectionItem[];
  visible: boolean;
  sortOrder: number;
};

const emptyForm = {
  title: "",
  subtitle: "",
  videoUrl: "",
  videoThumbnailUrl: "",
  items: [] as SectionItem[],
  visible: true,
  sortOrder: 0,
};

export default function AdminSectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/sections");
    const data = await res.json();
    setSections(data.sections || []);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(s: Section) {
    setEditingId(s.id);
    setForm({
      title: s.title,
      subtitle: s.subtitle,
      videoUrl: s.videoUrl,
      videoThumbnailUrl: s.videoThumbnailUrl,
      items: Array.isArray(s.items) ? s.items : [],
      visible: s.visible,
      sortOrder: s.sortOrder,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateItem(idx: number, patch: Partial<SectionItem>) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, {}] }));
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  async function save() {
    if (editingId) {
      await fetch(`/api/sections/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    resetForm();
    await load();
  }

  async function toggle(s: Section) {
    await fetch(`/api/sections/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !s.visible }),
    });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this section?")) return;
    await fetch(`/api/sections/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Unlimited Sections"
        subtitle="Create, rename, delete, hide or reorder brand new homepage sections — with an optional featured video."
      />

      <Card className="mb-6">
        <p className="mb-4 font-bold text-white">{editingId ? "Edit Section" : "Add New Section"}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Section Title">
            <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Sort Order">
            <TextInput
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
            />
          </Field>
          <Field label="Subtitle">
            <TextInput
              className="sm:col-span-2"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </Field>
          <Field label="Video URL (YouTube, optional)">
            <TextInput value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
          </Field>
          <Field label="Video Thumbnail URL (optional)">
            <TextInput
              value={form.videoThumbnailUrl}
              onChange={(e) => setForm({ ...form, videoThumbnailUrl: e.target.value })}
            />
          </Field>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
          <Toggle checked={form.visible} onChange={(v) => setForm({ ...form, visible: v })} /> Visible on homepage
        </label>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-300">Cards / Items</p>
            <Button variant="ghost" onClick={addItem}>
              + Add Item
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {form.items.map((item, idx) => (
              <div key={idx} className="grid gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-2">
                <TextInput
                  placeholder="Title"
                  value={item.title || ""}
                  onChange={(e) => updateItem(idx, { title: e.target.value })}
                />
                <TextInput
                  placeholder="Image URL"
                  value={item.imageUrl || ""}
                  onChange={(e) => updateItem(idx, { imageUrl: e.target.value })}
                />
                <TextArea
                  placeholder="Description"
                  rows={2}
                  className="sm:col-span-2"
                  value={item.description || ""}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                />
                <TextInput
                  placeholder="Price label (e.g. ৳500)"
                  value={item.price || ""}
                  onChange={(e) => updateItem(idx, { price: e.target.value })}
                />
                <TextInput
                  placeholder="Link (e.g. wa.me/...)"
                  value={item.link || ""}
                  onChange={(e) => updateItem(idx, { link: e.target.value })}
                />
                <TextInput
                  placeholder="Button text"
                  value={item.buttonText || ""}
                  onChange={(e) => updateItem(idx, { buttonText: e.target.value })}
                />
                <Button variant="danger" onClick={() => removeItem(idx)}>
                  Remove Item
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <Button onClick={save} disabled={!form.title}>
            {editingId ? "Update Section" : "Add Section"}
          </Button>
          {editingId ? (
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          ) : null}
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {sections.map((s) => (
          <Card key={s.id} className="flex flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-white">{s.title}</p>
              <p className="text-xs text-slate-500">{Array.isArray(s.items) ? s.items.length : 0} items · order {s.sortOrder}</p>
            </div>
            <div className="flex items-center gap-3">
              <Toggle checked={s.visible} onChange={() => toggle(s)} />
              <Button variant="ghost" onClick={() => startEdit(s)}>
                Edit
              </Button>
              <Button variant="danger" onClick={() => remove(s.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {sections.length === 0 ? <p className="text-sm text-slate-500">No custom sections yet.</p> : null}
      </div>
    </div>
  );
}
