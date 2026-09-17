"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, PageHeader, TextArea, TextInput, Toggle } from "@/components/admin/ui";

type Testimonial = {
  id: number;
  name: string;
  avatarUrl: string;
  message: string;
  rating: number;
  visible: boolean;
};

const emptyForm = { name: "", avatarUrl: "", message: "", rating: 5 };

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const res = await fetch("/api/testimonials");
    const data = await res.json();
    setItems(data.testimonials || []);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/testimonials");
      const data = await res.json();
      if (!cancelled) setItems(data.testimonials || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function add() {
    if (!form.name || !form.message) return;
    await fetch("/api/testimonials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    await load();
  }

  async function toggle(t: Testimonial) {
    await fetch(`/api/testimonials/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !t.visible }),
    });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this testimonial?")) return;
    await fetch(`/api/testimonials/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader title="Customer Reviews" subtitle="Testimonials shown on the homepage." />

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer Name">
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Avatar URL (optional)">
            <TextInput value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
          </Field>
          <Field label="Rating (1-5)">
            <TextInput
              type="number"
              min={1}
              max={5}
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
            />
          </Field>
          <Field label="Message">
            <TextArea
              rows={3}
              className="sm:col-span-2"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </Field>
        </div>
        <Button className="mt-4" onClick={add}>
          Add Testimonial
        </Button>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <Card key={t.id}>
            <p className="font-bold text-white">{t.name}</p>
            <p className="mt-1 text-amber-400">{"★".repeat(t.rating)}</p>
            <p className="mt-2 text-sm text-slate-400">{t.message}</p>
            <div className="mt-3 flex items-center justify-between">
              <Toggle checked={t.visible} onChange={() => toggle(t)} />
              <Button variant="danger" onClick={() => remove(t.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {items.length === 0 ? <p className="text-sm text-slate-500">No testimonials yet.</p> : null}
      </div>
    </div>
  );
}
