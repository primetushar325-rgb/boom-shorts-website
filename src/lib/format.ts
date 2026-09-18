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
  /** The customer's own WhatsApp number. */
  phone?: string;
  packageName: string;
  packageQuantity?: string | null;
  quantity?: number;
  /** Original (pre-discount) amount for the whole order. */
  originalPrice?: number | string | null;
  /** Total discount for the whole order (package + coupon). */
  discount?: number | string | null;
  couponCode?: string | null;
  couponDiscount?: number | string | null;
  /** What the customer actually pays. Legacy callers pass this as `amount`. */
  amount: number | string;
  paymentMethod?: string;
  /** The number the money was sent FROM. */
  paymentNumber?: string;
  transactionId?: string;
  /** Note the customer wrote at checkout. */
  note?: string | null;
};

/**
 * Message used by every "Chat on WhatsApp" / "Send on WhatsApp" button.
 *
 * `wa.me` opens WhatsApp with this text prefilled so the CUSTOMER taps send —
 * it is click-to-chat, never automatic server-side sending.
 *
 * The destination number is always the one configured in the settings table
 * (`settings.whatsappNumber`); nothing is hard-coded here.
 */
export function orderWhatsAppMessage(opts: WhatsAppOrderMessage): string {
  const discount = Number(opts.discount ?? 0) || 0;
  const couponDiscount = Number(opts.couponDiscount ?? 0) || 0;
  const totalDiscount = discount + couponDiscount;
  const quantity = Number(opts.quantity ?? 0) || 0;

  const lines = [
    "🛒 *Order Confirmation — Boom Shorts*",
    "",
    opts.orderCode ? `🆔 Order ID: ${opts.orderCode}` : "",
    opts.name ? `👤 Name: ${opts.name}` : "",
    opts.phone ? `📱 WhatsApp: ${opts.phone}` : "",
    `📦 Package: ${opts.packageName}`,
    opts.packageQuantity ? `📋 Deliverable: ${opts.packageQuantity}` : "",
    quantity ? `🔢 Quantity: ${quantity}` : "",
    "",
    opts.originalPrice !== null && opts.originalPrice !== undefined && Number(opts.originalPrice) > 0
      ? `🏷️ Original price: ${taka(opts.originalPrice)}`
      : "",
    totalDiscount > 0 ? `🎁 Discount: − ${taka(totalDiscount)}` : "",
    opts.couponCode ? `🎟️ Coupon: ${opts.couponCode}${couponDiscount > 0 ? ` (− ${taka(couponDiscount)})` : ""}` : "",
    `💰 Total payable: ${taka(opts.amount)}`,
    "",
    opts.paymentMethod ? `💳 Payment method: ${opts.paymentMethod}` : "",
    opts.paymentNumber ? `📲 Paid from: ${opts.paymentNumber}` : "",
    opts.transactionId ? `🧾 Transaction ID: ${opts.transactionId}` : "",
    opts.note ? `📝 Note: ${opts.note}` : "",
    "",
    "Please verify my payment. Thank you!",
  ];

  // Collapse the blank separator lines when whole groups are missing.
  return lines
    .join("\n")
    .split("\n")
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}
