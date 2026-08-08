"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/admin/ui";
import { taka } from "@/lib/format";

type Dashboard = {
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
  topPackage: { name: string; count: number } | null;
  totalVisitors: number;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const stats = [
    { label: "Total Orders", value: data?.totalOrders ?? "-", icon: "🧾" },
    { label: "Pending Orders", value: data?.pendingOrders ?? "-", icon: "⏳" },
    { label: "Revenue", value: data ? taka(data.revenue) : "-", icon: "💰" },
    { label: "Total Visitors", value: data?.totalVisitors ?? "-", icon: "👀" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your website performance." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="transition hover:-translate-y-1 hover:border-amber-300/30">
            <div className="text-2xl">{s.icon}</div>
            <p className="mt-3 text-2xl font-extrabold text-white">{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Top Package</p>
        {data?.topPackage ? (
          <p className="mt-2 text-lg font-bold text-white">
            {data.topPackage.name} <span className="text-sm font-normal text-slate-400">({data.topPackage.count} orders)</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No orders yet.</p>
        )}
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <a href="/admin/orders" className="block">
          <Card className="transition hover:-translate-y-1 hover:border-amber-300/30">
            <p className="font-bold text-white">🧾 Manage Orders →</p>
            <p className="mt-1 text-sm text-slate-400">View, confirm, complete or reject customer orders.</p>
          </Card>
        </a>
        <a href="/admin/packages" className="block">
          <Card className="transition hover:-translate-y-1 hover:border-amber-300/30">
            <p className="font-bold text-white">📦 Manage Packages →</p>
            <p className="mt-1 text-sm text-slate-400">Edit Boom Shorts & Other Services packages and pricing.</p>
          </Card>
        </a>
      </div>
    </div>
  );
}
