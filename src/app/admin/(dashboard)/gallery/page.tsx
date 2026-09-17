"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, PageHeader, TextInput, Toggle } from "@/components/admin/ui";

type GalleryItem = { id: number; imageUrl: string; caption: string; visible: boolean };

export default function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  async function load() {
    const res = await fetch("/api/gallery");
    const data = await res.json();
    setItems(data.gallery || []);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/gallery");
      const data = await res.json();
      if (!cancelled) setItems(data.gallery || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (res.ok) setImageUrl(data.url);
  }

  async function add() {
    if (!imageUrl) return;
    await fetch("/api/gallery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl, caption }),
    });
    setImageUrl("");
    setCaption("");
    await load();
  }

  async function toggle(g: GalleryItem) {
    await fetch(`/api/gallery/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !g.visible }),
    });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this image?")) return;
    await fetch(`/api/gallery/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader title="Gallery" subtitle="Portfolio images shown in the 'Our Work' section." />

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Image URL">
            <TextInput value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </Field>
          <Field label="Or Upload Image">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              className="text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-white"
            />
          </Field>
          <Field label="Caption (optional)">
            <TextInput className="sm:col-span-2" value={caption} onChange={(e) => setCaption(e.target.value)} />
          </Field>
        </div>
        <Button className="mt-4" onClick={add} disabled={uploading}>
          {uploading ? "Uploading..." : "Add Image"}
        </Button>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((g) => (
          <Card key={g.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.imageUrl} alt={g.caption} className="h-32 w-full rounded-lg object-cover" />
            {g.caption ? <p className="mt-2 text-xs text-slate-400">{g.caption}</p> : null}
            <div className="mt-2 flex items-center justify-between">
              <Toggle checked={g.visible} onChange={() => toggle(g)} />
              <Button variant="danger" onClick={() => remove(g.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {items.length === 0 ? <p className="text-sm text-slate-500">No images yet.</p> : null}
      </div>
    </div>
  );
}
