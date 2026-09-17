"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, PageHeader, TextInput, Toggle } from "@/components/admin/ui";

type Coupon = {
  id: number;
  code: string;
  discountPercent: number;
  active: boolean;
  expiresAt: string | null;
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(10);
  const [expiresAt, setExpiresAt] = useState("");

  async function load() {
    const res = await fetch("/api/coupons");
    const data = await res.json();
    setCoupons(data.coupons || []);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/coupons");
      const data = await res.json();
      if (!cancelled) setCoupons(data.coupons || []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function add() {
    if (!code.trim()) return;
    await fetch("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, discountPercent, expiresAt: expiresAt || null }),
    });
    setCode("");
    setDiscountPercent(10);
    setExpiresAt("");
    await load();
  }

  async function toggleActive(c: Coupon) {
    await fetch(`/api/coupons/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this coupon?")) return;
    await fetch(`/api/coupons/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader title="Coupon Codes" subtitle="Create discount coupons customers can apply at checkout." />

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Coupon Code">
            <TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SAVE10" />
          </Field>
          <Field label="Discount %">
            <TextInput
              type="number"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
            />
          </Field>
          <Field label="Expires At (optional)">
            <TextInput type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </Field>
        </div>
        <Button className="mt-4" onClick={add}>
          Add Coupon
        </Button>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {coupons.map((c) => (
          <Card key={c.id}>
            <p className="text-lg font-extrabold text-white">{c.code}</p>
            <p className="mt-1 text-sm text-amber-300">{c.discountPercent}% OFF</p>
            {c.expiresAt ? (
              <p className="mt-1 text-xs text-slate-500">Expires: {new Date(c.expiresAt).toLocaleDateString()}</p>
            ) : null}
            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <Toggle checked={c.active} onChange={() => toggleActive(c)} /> Active
              </label>
              <Button variant="danger" onClick={() => remove(c.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {coupons.length === 0 ? <p className="text-sm text-slate-500">No coupons yet.</p> : null}
      </div>
    </div>
  );
}
