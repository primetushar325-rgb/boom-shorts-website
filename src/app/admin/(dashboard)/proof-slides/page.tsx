"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, PageHeader, TextInput, Toggle } from "@/components/admin/ui";

type ProofSlide = { id: number; imageUrl: string; caption: string; visible: boolean };

export default function AdminProofSlidesPage() {
  const [items, setItems] = useState<ProofSlide[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  async function load() {
    const res = await fetch("/api/proof-slides");
    const data = await res.json();
    setItems(data.proofSlides || []);
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
    if (res.ok) setImageUrl(data.url);
  }

  async function add() {
    if (!imageUrl) return;
    await fetch("/api/proof-slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl, caption }),
    });
    setImageUrl("");
    setCaption("");
    await load();
  }

  async function toggle(item: ProofSlide) {
    await fetch(`/api/proof-slides/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !item.visible }),
    });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this slide?")) return;
    await fetch(`/api/proof-slides/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Client Review Slider"
        subtitle="Screenshots (YouTube analytics, WhatsApp reviews, etc.) shown in the auto-sliding 'Client Review' carousel below the hero."
      />

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
              className="text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-slate-950"
            />
          </Field>
          <Field label="Caption (optional)">
            <TextInput className="sm:col-span-2" value={caption} onChange={(e) => setCaption(e.target.value)} />
          </Field>
        </div>
        <Button className="mt-4" onClick={add} disabled={uploading}>
          {uploading ? "Uploading..." : "Add Slide"}
        </Button>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <Card key={item.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt={item.caption} className="h-48 w-full rounded-lg object-cover" />
            {item.caption ? <p className="mt-2 text-xs text-slate-400">{item.caption}</p> : null}
            <div className="mt-2 flex items-center justify-between">
              <Toggle checked={item.visible} onChange={() => toggle(item)} />
              <Button variant="danger" onClick={() => remove(item.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {items.length === 0 ? <p className="text-sm text-slate-500">No slides yet.</p> : null}
      </div>
    </div>
  );
}
