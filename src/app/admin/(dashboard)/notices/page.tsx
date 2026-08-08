"use client";

import { useEffect, useState } from "react";
import { Button, Card, PageHeader, TextInput, Toggle } from "@/components/admin/ui";

type Notice = { id: number; text: string; visible: boolean; sortOrder: number };

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [text, setText] = useState("");

  async function load() {
    const res = await fetch("/api/notices");
    const data = await res.json();
    setNotices(data.notices || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!text.trim()) return;
    await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setText("");
    await load();
  }

  async function toggle(n: Notice) {
    await fetch(`/api/notices/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !n.visible }),
    });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this notice?")) return;
    await fetch(`/api/notices/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader title="Notice Board" subtitle="Scrolling announcement bar shown under the header." />

      <Card className="mb-6">
        <div className="flex gap-3">
          <TextInput value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a notice..." className="flex-1" />
          <Button onClick={add}>Add</Button>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {notices.map((n) => (
          <Card key={n.id} className="flex flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-200">{n.text}</p>
            <div className="flex items-center gap-3">
              <Toggle checked={n.visible} onChange={() => toggle(n)} />
              <Button variant="danger" onClick={() => remove(n.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {notices.length === 0 ? <p className="text-sm text-slate-500">No notices yet.</p> : null}
      </div>
    </div>
  );
}
