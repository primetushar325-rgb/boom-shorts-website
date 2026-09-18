import { ORDER_STATUS_LABELS } from "./constants";

export function taka(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "৳0";
  const rounded = Math.abs(n % 1) < 0.005 ? Math.round(n) : n;
  return `৳${rounded.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
}

export function discountPercent(
  oldPrice: number | string | null | undefined,
  newPrice: number | string | null | undefined,
): number {
  const oldN = Number(oldPrice ?? 0);
  const newN = Number(newPrice ?? 0);
  if (!oldN || oldN <= newN) return 0;
  return Math.round(((oldN - newN) / oldN) * 100);
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = (phone || "").replace(/[^\d]/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

export function normalizePhone(value: string): string {
  const digits = (value || "").replace(/[^\d]/g, "");
  if (digits.startsWith("880") && digits.length === 13) return `0${digits.slice(3)}`;
  return digits;
}

export function isValidBdPhone(value: string): boolean {
  const phone = normalizePhone(value);
  return /^01[3-9]\d{8}$/.test(phone);
}

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type WhatsAppOrderMessage = {
  orderCode?: string | null;
  name?: string;
  phone?: string;
  packageName: string;
  quantity?: number;
  amount: number | string;
  paymentMethod?: string;
  transactionId?: string;
};

/** Message used by the "Chat on WhatsApp" buttons — same fields, one format. */
export function orderWhatsAppMessage(opts: WhatsAppOrderMessage): string {
  const lines = [
    "🛒 *Order Confirmation — Boom Shorts*",
    "",
    opts.orderCode ? `🆔 Order ID: ${opts.orderCode}` : "",
    opts.name ? `👤 Name: ${opts.name}` : "",
    `📦 Package: ${opts.packageName}`,
    opts.quantity && opts.quantity > 1 ? `🔢 Quantity: ${opts.quantity}` : "",
    `💰 Amount: ${taka(opts.amount)}`,
    opts.paymentMethod ? `💳 Payment: ${opts.paymentMethod}` : "",
    opts.transactionId ? `🧾 Transaction ID: ${opts.transactionId}` : "",
    opts.phone ? `📱 Customer WhatsApp: ${opts.phone}` : "",
    "",
    "Please verify my payment. Thank you!",
  ];
  return lines.filter((line) => line !== "").join("\n");
}
