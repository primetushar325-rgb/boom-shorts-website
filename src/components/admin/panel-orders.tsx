"use client";

import { useMemo, useState } from "react";
import { formatDateTime, orderStatusLabel, taka } from "@/lib/format";
import { ORDER_STATUSES } from "@/lib/constants";
import {
  AdminScreen,
  apiSend,
  Button,
  EmptyState,
  Loading,
  Notice,
  Select,
  StatusPill,
  TextArea,
  TextInput,
  useApi,
} from "@/components/admin/ui";

type OrderRow = {
  id: number;
  orderCode: string | null;
  customerName: string;
  whatsapp: string;
  packageId: number | null;
  packageName: string;
  packageQuantity: string;
  quantity: number;
  unitPrice: string | null;
  originalPrice: string | null;
  discountAmount: string;
  couponCode: string | null;
  couponDiscount: string;
  price: string;
  paymentMethod: string;
  paymentNumber: string;
  transactionId: string;
  screenshotUrl: string;
  paymentStatus: string;
  status: string;
  adminNote: string;
  createdAt: string;
};

export function OrdersPanel({
  activeScreen,
  mode = "orders",
}: {
  activeScreen: number;
  mode?: "orders" | "payments";
}) {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (search.trim()) params.set("q", search.trim());
    return `/api/orders?${params.toString()}`;
  }, [status, search]);

  const { data, loading, error, reload } = useApi<{ orders: OrderRow[] }>(query);
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");

  const orders = useMemo(() => data?.orders ?? [], [data]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const order of orders) counts[order.status] = (counts[order.status] ?? 0) + 1;
    return counts;
  }, [orders]);

  async function patch(id: number, body: Record<string, unknown>, message: string) {
    const result = await apiSend(`/api/orders/${id}`, "PATCH", body);
    if (!result.ok) {
      setNotice(String(result.data.error ?? "Update failed"));
      return;
    }
    setNotice(message);
    reload();
    setSelected((current) => (current ? { ...current, ...(result.data.order as OrderRow) } : null));
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this order permanently?")) return;
    const result = await apiSend(`/api/orders/${id}`, "DELETE");
    if (result.ok) {
      setNotice("Order deleted");
      setSelected(null);
      reload();
    }
  }

  const title = mode === "payments" ? "Payments" : "Orders";

  return (
    <>
      <AdminScreen
        label="Screen 1 · Overview"
        title={title}
        subtitle={mode === "payments" ? "Verify customer payments" : "All incoming orders"}
        active={activeScreen === 0}
      >
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              { id: "all", label: "All orders", value: orders.length },
              { id: "pending", label: "Pending", value: summary.pending ?? 0 },
              { id: "payment_verified", label: "Payment verified", value: summary.payment_verified ?? 0 },
              { id: "processing", label: "Processing", value: summary.processing ?? 0 },
              { id: "completed", label: "Completed", value: summary.completed ?? 0 },
              { id: "rejected", label: "Rejected", value: summary.rejected ?? 0 },
            ] as const
          ).map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setStatus(card.id)}
              className={`rounded-2xl border p-3 text-left transition ${
                status === card.id ? "border-gold bg-gold-soft" : "border-line bg-coal"
              }`}
            >
              <p className="text-lg font-extrabold text-warm">{card.value}</p>
              <p className="text-[11px] text-muted">{card.label}</p>
            </button>
          ))}
        </div>

        {mode === "payments" ? (
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Open an order, check the Transaction ID against your bKash/Nagad statement and the
            attached screenshot, then tap &quot;Verify payment&quot;. Verifying moves the order to
            Payment Verified automatically.
          </p>
        ) : null}

        <Notice kind="ok" text={notice} />
      </AdminScreen>

      <AdminScreen
        label="Screen 2 · List"
        title={mode === "payments" ? "Payment queue" : "Order list"}
        subtitle={`${orders.length} orders`}
        active={activeScreen === 1}
        action={
          <Button variant="ghost" className="px-3 py-1.5 text-[11px]" onClick={reload}>
            Refresh
          </Button>
        }
      >
        <div className="mb-3 flex flex-col gap-2">
          <TextInput
            placeholder="🔍 Search name, phone, order id, trx id"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {orderStatusLabel(value)}
              </option>
            ))}
          </Select>
        </div>

        {loading ? <Loading /> : null}
        <Notice kind="error" text={error} />

        <div className="flex flex-col gap-2">
          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => {
                setSelected(order);
                setNote(order.adminNote ?? "");
                setNotice("");
              }}
              className={`row-tap ${selected?.id === order.id ? "border-gold ring-1 ring-gold-line" : ""}`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-[10px] font-bold text-warm-dim">
                {order.orderCode?.replace("BS-", "") ?? order.id}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-bold text-warm">
                    {order.customerName}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted">
                  {order.packageName} ×{order.quantity} · {taka(order.price)}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-muted-2">
                  {order.paymentMethod} · {order.transactionId}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <StatusPill value={order.status} />
                <StatusPill value={order.paymentStatus} />
              </span>
            </button>
          ))}
          {!loading && orders.length === 0 ? <EmptyState text="No orders match this filter." /> : null}
        </div>
      </AdminScreen>

      <AdminScreen
        label="Screen 3 · Detail"
        title={selected ? selected.orderCode || `Order #${selected.id}` : "Select an order"}
        subtitle={selected ? formatDateTime(selected.createdAt) : "Tap an order in the list"}
        active={activeScreen === 2}
      >
        {selected ? (
          <>
            <div className="rounded-2xl border border-line bg-white/5 p-3">
              <p className="text-[13px] font-extrabold text-warm">{selected.customerName}</p>
              <p className="text-[12px] text-warm-dim">
                <a
                  href={`https://wa.me/88${selected.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-ok underline"
                >
                  {selected.whatsapp}
                </a>
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <Detail label="Package" value={selected.packageName} />
                <Detail label="Quantity" value={String(selected.quantity)} />
                <Detail
                  label="Package amount"
                  value={`${taka(selected.originalPrice ?? selected.price)} → ${taka(selected.unitPrice ?? selected.price)}`}
                />
                <Detail label="Package discount" value={taka(selected.discountAmount)} />
                <Detail
                  label="Coupon"
                  value={
                    selected.couponCode
                      ? `${selected.couponCode} (−${taka(selected.couponDiscount)})`
                      : "—"
                  }
                />
                <Detail label="Total paid" value={taka(selected.price)} strong />
                <Detail label="Payment method" value={selected.paymentMethod} />
                <Detail label="Payer number" value={selected.paymentNumber || "—"} />
                <Detail label="Transaction ID" value={selected.transactionId} strong />
                <Detail label="Payment status" value={selected.paymentStatus} />
              </div>
              {selected.packageQuantity ? (
                <p className="mt-2 text-[11px] text-muted">Deliverable: {selected.packageQuantity}</p>
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={`/api/admin/screenshot/${selected.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn-outline w-full py-2 text-[12px] ${selected.screenshotUrl ? "" : "pointer-events-none opacity-50"}`}
              >
                📷 View screenshot
              </a>
              <a
                href={`https://wa.me/88${selected.whatsapp}?text=${encodeURIComponent(
                  `Hello ${selected.customerName}, about your order ${selected.orderCode ?? ""} (${selected.packageName}) — `,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp w-full py-2 text-[12px]"
              >
                WhatsApp customer
              </a>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-2">
                Payment
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => patch(selected.id, { paymentStatus: "verified" }, "Payment verified")}
                >
                  ✅ Verify payment
                </Button>
                <Button
                  variant="danger"
                  onClick={() => patch(selected.id, { paymentStatus: "rejected" }, "Payment rejected")}
                >
                  ⛔ Reject payment
                </Button>
              </div>

              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-muted-2">
                Order status
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ORDER_STATUSES.map((value) => (
                  <Button
                    key={value}
                    variant={selected.status === value ? "primary" : "outline"}
                    onClick={() => patch(selected.id, { status: value }, `Status: ${value}`)}
                    className="py-2 text-[12px] capitalize"
                  >
                    {orderStatusLabel(value)}
                  </Button>
                ))}
              </div>

              <TextArea
                rows={2}
                placeholder="Internal note (admin only)"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <Button
                variant="ghost"
                onClick={() => patch(selected.id, { adminNote: note }, "Note saved")}
              >
                Save note
              </Button>

              <Button variant="danger" onClick={() => remove(selected.id)}>
                Delete order
              </Button>
            </div>

            <Notice kind="ok" text={notice} />
          </>
        ) : (
          <EmptyState text="Orders, payment details and screenshots appear here." />
        )}
      </AdminScreen>
    </>
  );
}

function Detail({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-2">{label}</p>
      <p className={`mt-0.5 ${strong ? "font-extrabold text-warm" : "font-semibold text-warm-dim"}`}>
        {value}
      </p>
    </div>
  );
}
