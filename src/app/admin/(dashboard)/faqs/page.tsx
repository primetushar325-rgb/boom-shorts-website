"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, PageHeader, TextArea, TextInput, Toggle } from "@/components/admin/ui";

type Faq = { id: number; question: string; answer: string; visible: boolean };

const emptyForm = { question: "", answer: "" };

export default function AdminFaqsPage() {
  const [items, setItems] = useState<Faq[]>([]);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const res = await fetch("/api/faqs");
    const data = await res.json();
    setItems(data.faqs || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!form.question || !form.answer) return;
    await fetch("/api/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    await load();
  }

  async function toggle(f: Faq) {
    await fetch(`/api/faqs/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !f.visible }),
    });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this FAQ?")) return;
    await fetch(`/api/faqs/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader title="FAQ" subtitle="Frequently asked questions shown on the homepage." />

      <Card className="mb-6">
        <div className="grid gap-4">
          <Field label="Question">
            <TextInput value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          </Field>
          <Field label="Answer">
            <TextArea rows={3} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
          </Field>
        </div>
        <Button className="mt-4" onClick={add}>
          Add FAQ
        </Button>
      </Card>

      <div className="flex flex-col gap-3">
        {items.map((f) => (
          <Card key={f.id} className="flex flex-row items-start justify-between gap-4">
            <div>
              <p className="font-bold text-white">{f.question}</p>
              <p className="mt-1 text-sm text-slate-400">{f.answer}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Toggle checked={f.visible} onChange={() => toggle(f)} />
              <Button variant="danger" onClick={() => remove(f.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {items.length === 0 ? <p className="text-sm text-slate-500">No FAQs yet.</p> : null}
      </div>
    </div>
  );
}
