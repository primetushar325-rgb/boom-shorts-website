"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, PageHeader, TextInput, Toggle } from "@/components/admin/ui";

type Banner = {
  id: number;
  title: string;
  imageUrl: string;
  link: string;
  type: string;
  visible: boolean;
};

const emptyForm = { title: "", imageUrl: "", link: "", type: "banner" };

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const res = await fetch("/api/banners");
    const data = await res.json();
    setBanners(data.banners || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (res.ok) setForm((f) => ({ ...f, imageUrl: data.url }));
  }

  async function add() {
    if (!form.imageUrl && !form.title) return;
    await fetch("/api/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    await load();
  }

  async function toggle(b: Banner) {
    await fetch(`/api/banners/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !b.visible }),
    });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this banner?")) return;
    await fetch(`/api/banners/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader title="Banners & Offers" subtitle="Promotional banners shown below the hero section." />

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Type">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="banner">Banner</option>
              <option value="offer">Offer</option>
            </select>
          </Field>
          <Field label="Image URL">
            <TextInput value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </Field>
          <Field label="Or Upload Image">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              className="text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-white"
            />
          </Field>
          <Field label="Link (optional)">
            <TextInput
              className="sm:col-span-2"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
            />
          </Field>
        </div>
        <Button className="mt-4" onClick={add} disabled={uploading}>
          {uploading ? "Uploading..." : "Add Banner"}
        </Button>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banners.map((b) => (
          <Card key={b.id}>
            {b.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.imageUrl} alt={b.title} className="h-32 w-full rounded-lg object-cover" />
            ) : null}
            <p className="mt-3 font-bold text-white">{b.title || "Untitled"}</p>
            <p className="text-xs uppercase text-slate-500">{b.type}</p>
            <div className="mt-3 flex items-center justify-between">
              <Toggle checked={b.visible} onChange={() => toggle(b)} />
              <Button variant="danger" onClick={() => remove(b.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {banners.length === 0 ? <p className="text-sm text-slate-500">No banners yet.</p> : null}
      </div>
    </div>
  );
}
