"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDateTime, taka } from "@/lib/format";
import {
  AdminScreen,
  apiSend,
  Button,
  EmptyState,
  Loading,
  Notice,
  Stars,
  StatusPill,
  TextInput,
  useApi,
} from "@/components/admin/ui";

export const ADMIN_SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: "📊", group: "Overview" },
  { id: "orders", label: "Orders", icon: "🧾", group: "Sales" },
  { id: "payments", label: "Payments", icon: "💳", group: "Sales" },
  { id: "customers", label: "Customers", icon: "👥", group: "Sales" },
  { id: "packages", label: "Packages", icon: "📦", group: "Catalog" },
  { id: "videos", label: "Product Videos", icon: "🎬", group: "Catalog" },
  { id: "coupons", label: "Coupons", icon: "🏷️", group: "Marketing" },
  { id: "banners", label: "Banners", icon: "🖼️", group: "Marketing" },
  { id: "notices", label: "Notice Board", icon: "📢", group: "Marketing" },
  { id: "reviews", label: "Reviews", icon: "⭐", group: "Marketing" },
  { id: "testimonials", label: "Testimonials", icon: "💬", group: "Content" },
  { id: "proof-slides", label: "Client Proof", icon: "📸", group: "Content" },
  { id: "gallery", label: "Gallery", icon: "🏞️", group: "Content" },
  { id: "free-video", label: "Free Videos", icon: "🎁", group: "Content" },
  { id: "faqs", label: "FAQ", icon: "❓", group: "Content" },
  { id: "sections", label: "Custom Sections", icon: "🧩", group: "Content" },
  { id: "settings", label: "Settings", icon: "⚙️", group: "System" },
] as const;

export type SectionId = (typeof ADMIN_SECTIONS)[number]["id"];

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
type DashboardData = {
  totalOrders: number;
  pendingOrders: number;
  verifiedOrders: number;
  processingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  revenue: number;
  customers: number;
  availablePackages: number;
  totalPackages: number;
  pendingReviews: number;
  approvedReviews: number;
  totalVisitors: number;
  topPackage: { name: string; count: number } | null;
  recentOrders: {
    id: number;
    orderCode: string | null;
    customerName: string;
    packageName: string;
    price: string;
    status: string;
    createdAt: string;
  }[];
};

export function DashboardPanel({ activeScreen }: { activeScreen: number }) {
  const { data, loading, error, reload } = useApi<DashboardData>("/api/dashboard");

  const stats = useMemo(
    () => [
      { label: "Total orders", value: data?.totalOrders ?? 0, icon: "🧾" },
      { label: "Pending", value: data?.pendingOrders ?? 0, icon: "⏳" },
      { label: "Completed", value: data?.completedOrders ?? 0, icon: "✅" },
      { label: "Revenue", value: taka(data?.revenue ?? 0), icon: "💰" },
      { label: "Customers", value: data?.customers ?? 0, icon: "👥" },
      { label: "Available packages", value: data?.availablePackages ?? 0, icon: "📦" },
    ],
    [data],
  );

  return (
    <>
      <AdminScreen
        label="Screen 1 · Menu"
        title="Dashboard"
        subtitle="Business at a glance"
        active={activeScreen === 0}
        action={
          <Button variant="ghost" className="px-3 py-1.5 text-[11px]" onClick={reload}>
            Refresh
          </Button>
        }
      >
        {loading ? <Loading /> : null}
        <Notice kind="error" text={error} />

        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-base" aria-hidden>
                {stat.icon}
              </p>
              <p className="mt-1 text-lg font-extrabold text-navy">{stat.value}</p>
              <p className="text-[11px] text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-lg font-extrabold text-amber-800">{data?.pendingReviews ?? 0}</p>
            <p className="text-[11px] text-amber-700">Reviews waiting</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
            <p className="text-lg font-extrabold text-blue-800">{data?.totalVisitors ?? 0}</p>
            <p className="text-[11px] text-blue-700">Total visitors</p>
          </div>
        </div>

        {data?.topPackage ? (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Best selling package
            </p>
            <p className="mt-1 text-sm font-bold text-navy">{data.topPackage.name}</p>
            <p className="text-[11px] text-slate-500">{data.topPackage.count} orders</p>
          </div>
        ) : null}
      </AdminScreen>

      <AdminScreen
        label="Screen 2 · Sections"
        title="Manage"
        subtitle="Everything you control"
        active={activeScreen === 1}
      >
        <div className="flex flex-col gap-2">
          {ADMIN_SECTIONS.filter((section) => section.id !== "dashboard").map((section) => (
            <Link key={section.id} href={`/admin/${section.id}`} className="row-tap">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100">
                {section.icon}
              </span>
              <span className="flex-1 text-[13px] font-bold text-navy">{section.label}</span>
              <span className="text-slate-300">›</span>
            </Link>
          ))}
        </div>
      </AdminScreen>

      <AdminScreen
        label="Screen 3 · Activity"
        title="Recent orders"
        subtitle="Latest 5 orders"
        active={activeScreen === 2}
      >
        {loading ? <Loading /> : null}
        {data?.recentOrders?.length ? (
          <div className="flex flex-col gap-2">
            {data.recentOrders.map((order) => (
              <Link key={order.id} href="/admin/orders" className="row-tap">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  {order.orderCode?.slice(-2) ?? "##"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-navy">
                    {order.customerName}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {order.packageName} · {taka(order.price)}
                  </span>
                </span>
                <StatusPill value={order.status} />
              </Link>
            ))}
          </div>
        ) : (
          !loading && <EmptyState text="No orders yet." />
        )}
      </AdminScreen>
    </>
  );
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
type CustomerRow = {
  id: number;
  name: string;
  phone: string;
  createdAt: string;
  orderCount: number;
  paidTotal: number;
  lastOrderAt: string | null;
};

export function CustomersPanel({ activeScreen }: { activeScreen: number }) {
  const { data, loading, error } = useApi<{ customers: CustomerRow[] }>("/api/admin/customers");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [orders, setOrders] = useState<
    { id: number; orderCode: string | null; packageName: string; price: string; status: string; createdAt: string }[]
  >([]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = data?.customers ?? [];
    if (!query) return list;
    return list.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) || customer.phone.includes(query),
    );
  }, [data, search]);

  async function open(customer: CustomerRow) {
    setSelected(customer);
    const res = await fetch(`/api/orders?q=${encodeURIComponent(customer.phone)}`, {
      cache: "no-store",
    });
    const payload = await res.json().catch(() => ({ orders: [] }));
    setOrders(payload.orders ?? []);
  }

  return (
    <>
      <AdminScreen
        label="Screen 1 · Customers"
        title="Customers"
        subtitle="Buyers with accounts"
        active={activeScreen === 0}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-lg font-extrabold text-navy">{data?.customers.length ?? 0}</p>
            <p className="text-[11px] text-slate-500">Total customers</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-lg font-extrabold text-navy">
              {rows.filter((customer) => customer.orderCount > 0).length}
            </p>
            <p className="text-[11px] text-slate-500">With orders</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          Customers sign in with their WhatsApp number and PIN to see their own order history. You
          can reach any of them on WhatsApp from the order detail screen.
        </p>
      </AdminScreen>

      <AdminScreen
        label="Screen 2 · List"
        title="Customer list"
        subtitle={`${rows.length} shown`}
        active={activeScreen === 1}
      >
        <TextInput
          placeholder="🔍 Search name or number"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="mb-3"
        />
        {loading ? <Loading /> : null}
        <Notice kind="error" text={error} />
        <div className="flex flex-col gap-2">
          {rows.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => open(customer)}
              className={`row-tap ${selected?.id === customer.id ? "border-blue-400 ring-1 ring-blue-200" : ""}`}
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                {(customer.name || customer.phone).slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold text-navy">
                  {customer.name || "Customer"}
                </span>
                <span className="block text-[11px] text-slate-500">{customer.phone}</span>
              </span>
              <span className="text-right">
                <span className="block text-[12px] font-bold text-navy">
                  {taka(customer.paidTotal)}
                </span>
                <span className="block text-[10px] text-slate-400">
                  {customer.orderCount} orders
                </span>
              </span>
            </button>
          ))}
          {!loading && rows.length === 0 ? <EmptyState text="No customers yet." /> : null}
        </div>
      </AdminScreen>

      <AdminScreen
        label="Screen 3 · Detail"
        title={selected ? selected.name || selected.phone : "Select a customer"}
        subtitle={selected ? selected.phone : "Tap a customer in the list"}
        active={activeScreen === 2}
      >
        {selected ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-base font-extrabold text-navy">{selected.orderCount}</p>
                <p className="text-[11px] text-slate-500">Orders</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-base font-extrabold text-navy">{taka(selected.paidTotal)}</p>
                <p className="text-[11px] text-slate-500">Paid volume</p>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {orders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-bold text-navy">{order.orderCode}</p>
                    <StatusPill value={order.status} />
                  </div>
                  <p className="mt-1 text-[12px] text-slate-600">{order.packageName}</p>
                  <p className="text-[11px] text-slate-400">
                    {taka(order.price)} · {formatDateTime(order.createdAt)}
                  </p>
                </div>
              ))}
              {orders.length === 0 ? <EmptyState text="No orders for this customer." /> : null}
            </div>

            <a
              href={`https://wa.me/88${selected.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp mt-3 w-full"
            >
              Chat on WhatsApp
            </a>
          </>
        ) : (
          <EmptyState text="Pick a customer to see their orders." />
        )}
      </AdminScreen>
    </>
  );
}

// ---------------------------------------------------------------------------
// Reviews (customer submitted, moderate before publishing)
// ---------------------------------------------------------------------------
type ReviewRow = {
  id: number;
  name: string;
  phone: string;
  packageName: string;
  rating: number;
  message: string;
  status: string;
  createdAt: string;
};

export function ReviewsPanel({ activeScreen }: { activeScreen: number }) {
  const [status, setStatus] = useState("pending");
  const { data, loading, error, reload } = useApi<{ reviews: ReviewRow[] }>(
    `/api/reviews?status=${status}`,
  );
  const [selected, setSelected] = useState<ReviewRow | null>(null);
  const [notice, setNotice] = useState("");

  async function moderate(id: number, next: "approved" | "rejected") {
    const result = await apiSend(`/api/admin/reviews/${id}`, "PATCH", { status: next });
    if (!result.ok) {
      setNotice(String(result.data.error ?? "Could not update the review"));
      return;
    }
    setNotice(`Review ${next}`);
    setSelected(null);
    reload();
  }

  async function remove(id: number) {
    const result = await apiSend(`/api/admin/reviews/${id}`, "DELETE");
    if (result.ok) {
      setNotice("Review deleted");
      setSelected(null);
      reload();
    }
  }

  const reviews = data?.reviews ?? [];

  return (
    <>
      <AdminScreen
        label="Screen 1 · Reviews"
        title="Reviews"
        subtitle="Approve before they go public"
        active={activeScreen === 0}
      >
        <div className="grid grid-cols-3 gap-2.5">
          {["pending", "approved", "rejected"].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-2xl border p-3 text-left transition ${
                status === value ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {value}
              </p>
              <p className="mt-1 text-sm font-extrabold text-navy">
                {status === value ? reviews.length : "—"}
              </p>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          Only approved reviews appear on the website. Customers can submit one review per order and
          cannot edit anyone else&apos;s review.
        </p>
        <Notice kind="ok" text={notice} />
      </AdminScreen>

      <AdminScreen
        label="Screen 2 · List"
        title="Customer reviews"
        subtitle={`${reviews.length} ${status}`}
        active={activeScreen === 1}
        action={
          <Button variant="ghost" className="px-3 py-1.5 text-[11px]" onClick={reload}>
            Refresh
          </Button>
        }
      >
        {loading ? <Loading /> : null}
        <Notice kind="error" text={error} />
        <div className="flex flex-col gap-2">
          {reviews.map((review) => (
            <button
              key={review.id}
              type="button"
              onClick={() => setSelected(review)}
              className={`row-tap ${selected?.id === review.id ? "border-blue-400 ring-1 ring-blue-200" : ""}`}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-bold text-navy">{review.name}</span>
                  <Stars value={review.rating} />
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[11px] text-slate-500">
                  {review.message}
                </span>
              </span>
              <StatusPill value={review.status} />
            </button>
          ))}
          {!loading && reviews.length === 0 ? (
            <EmptyState text={`No ${status} reviews.`} />
          ) : null}
        </div>
      </AdminScreen>

      <AdminScreen
        label="Screen 3 · Moderate"
        title={selected ? selected.name : "Select a review"}
        subtitle={selected ? formatDateTime(selected.createdAt) : "Tap a review in the list"}
        active={activeScreen === 2}
      >
        {selected ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <Stars value={selected.rating} />
              <p className="mt-2 text-[13px] leading-relaxed text-slate-700">{selected.message}</p>
              <p className="mt-2 text-[11px] text-slate-500">
                {selected.packageName ? `${selected.packageName} · ` : ""}
                {selected.phone}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button onClick={() => moderate(selected.id, "approved")}>✅ Approve</Button>
              <Button variant="danger" onClick={() => moderate(selected.id, "rejected")}>
                ⛔ Reject
              </Button>
            </div>
            <Button variant="outline" className="mt-2 w-full" onClick={() => remove(selected.id)}>
              Delete review
            </Button>
          </>
        ) : (
          <EmptyState text="Reviews wait here until you approve them." />
        )}
      </AdminScreen>
    </>
  );
}


