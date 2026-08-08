"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, PageHeader, TextInput } from "@/components/admin/ui";
import { taka } from "@/lib/format";

type Order = {
  id: number;
  customerName: string;
  whatsapp: string;
  packageName: string;
  price: string;
  couponCode: string | null;
  paymentMethod: string;
  transactionId: string;
  screenshotUrl: string;
  status: string;
  createdAt: string;
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-300",
  confirmed: "bg-sky-500/20 text-sky-300",
  completed: "bg-emerald-500/20 text-emerald-300",
  rejected: "bg-red-500/20 text-red-300",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data.orders || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this order?")) return;
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    await load();
  }

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        o.customerName.toLowerCase().includes(q) ||
        o.whatsapp.includes(q) ||
        o.packageName.toLowerCase().includes(q) ||
        o.transactionId.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  return (
    <div>
      <PageHeader title="Order Management" subtitle="Review, confirm and track customer orders." />

      <div className="mb-5 flex flex-wrap gap-3">
        <TextInput
          placeholder="🔍 Search by name, phone, package, trx id..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[260px] flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="flex flex-col gap-4">
        {filtered.map((o) => (
          <Card key={o.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-bold text-white">
                  {o.customerName} <span className="text-sm font-normal text-slate-500">· {o.whatsapp}</span>
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  📦 {o.packageName} — <span className="font-semibold text-amber-300">{taka(o.price)}</span>
                  {o.couponCode ? <span className="ml-2 text-emerald-400">🏷️ {o.couponCode}</span> : null}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {o.paymentMethod} · Trx: {o.transactionId} · {new Date(o.createdAt).toLocaleString()}
                </p>
                {o.screenshotUrl ? (
                  <a
                    href={o.screenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-sky-400 underline"
                  >
                    View Screenshot
                  </a>
                ) : null}
              </div>
              <span className={`h-fit rounded-full px-3 py-1 text-xs font-bold capitalize ${statusColors[o.status]}`}>
                {o.status}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {["pending", "confirmed", "completed", "rejected"].map((s) => (
                <Button
                  key={s}
                  variant={o.status === s ? "primary" : "ghost"}
                  onClick={() => updateStatus(o.id, s)}
                  className="capitalize"
                >
                  {s}
                </Button>
              ))}
              <Button variant="danger" onClick={() => remove(o.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 ? <p className="text-sm text-slate-500">No orders found.</p> : null}
      </div>
    </div>
  );
}
