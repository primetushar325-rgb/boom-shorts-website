"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, PageHeader, TextInput, Toggle } from "@/components/admin/ui";

type FreeVideoCard = { id: number; title: string; thumbnailUrl: string; link: string; visible: boolean };

export default function AdminFreeVideoPage() {
  const [items, setItems] = useState<FreeVideoCard[]>([]);
  const [title, setTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [link, setLink] = useState("");
  const [uploading, setUploading] = useState(false);

  async function load() {
    const res = await fetch("/api/free-video-cards");
    const data = await res.json();
    setItems(data.cards || []);
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
    if (res.ok) setThumbnailUrl(data.url);
  }

  async function add() {
    if (!title) return;
    await fetch("/api/free-video-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, thumbnailUrl, link }),
    });
    setTitle("");
    setThumbnailUrl("");
    setLink("");
    await load();
  }

  async function update(item: FreeVideoCard, patch: Partial<FreeVideoCard>) {
    await fetch(`/api/free-video-cards/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this card?")) return;
    await fetch(`/api/free-video-cards/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Free Video Cards"
        subtitle="Cards shown on the /free page. Each card opens its link when clicked."
      />

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Link (opens when card is clicked)">
            <TextInput value={link} onChange={(e) => setLink(e.target.value)} />
          </Field>
          <Field label="Thumbnail URL">
            <TextInput value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} />
          </Field>
          <Field label="Or Upload Thumbnail">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              className="text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-slate-950"
            />
          </Field>
        </div>
        <Button className="mt-4" onClick={add} disabled={uploading}>
          {uploading ? "Uploading..." : "Add Card"}
        </Button>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            {item.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.thumbnailUrl} alt={item.title} className="h-32 w-full rounded-lg object-cover" />
            ) : null}
            <p className="mt-2 text-sm font-bold text-white">{item.title}</p>
            <p className="truncate text-xs text-slate-500">{item.link}</p>
            <div className="mt-3 flex items-center justify-between">
              <Toggle checked={item.visible} onChange={() => update(item, { visible: !item.visible })} />
              <Button variant="danger" onClick={() => remove(item.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {items.length === 0 ? <p className="text-sm text-slate-500">No cards yet.</p> : null}
      </div>
    </div>
  );
}
