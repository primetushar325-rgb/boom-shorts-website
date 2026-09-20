import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "./constants";

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

/**
 * Display-only cleanup for admin-entered package names / labels.
 *
 * The database stays the source of truth — this never writes anything back, it
 * only fixes the missing-space typos that sneak into hand-typed titles such as
 * "Half Monthly Package (15 Days)30 Pis" or "15 PisUsa! Asmr Video".
 */
export function cleanLabel(value: string | null | undefined): string {
  if (!value) return "";
  return (
    value
      // ")30" → ") 30" — a closing paren glued to the next word/digits
      .replace(/\)(?=[A-Za-z0-9])/g, ") ")
      // "30Pis" → "30 Pis" — digits glued to the unit word
      .replace(/(\d)(?=Pis\b)/g, "$1 ")
      // "PisUsa" → "Pis Usa" — unit word glued to the following word
      .replace(/(Pis)(?=[A-Za-z!])/g, "$1 ")
      // collapse repeated spaces only — never touch newlines in descriptions
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}

/**
 * Extracts the latest explicit calendar date mentioned in a text.
 *
 * Understands `D/M/YYYY`, `D-M-YYYY`, `D.M.YYYY` (day first — the local
 * convention) and ISO `YYYY-MM-DD`. Returns null when the text contains no
 * recognizable date at all, so undated notices are never affected.
 */
export function latestDateInText(text: string): Date | null {
  let latest: Date | null = null;
  const consider = (year: number, month: number, day: number) => {
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) return;
    const date = new Date(year, month - 1, day, 23, 59, 59);
    if (!latest || date.getTime() > latest.getTime()) latest = date;
  };

  for (const match of text.matchAll(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/g)) {
    consider(Number(match[3]), Number(match[2]), Number(match[1]));
  }
  for (const match of text.matchAll(/(\d{4})-(\d{1,2})-(\d{1,2})/g)) {
    consider(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  return latest;
}

/**
 * True when a notice/promotion text carries a date that has fully passed.
 * Used to hide stale promotions ("50% Discount Coupon … Date : 5/8/2026")
 * automatically instead of showing expired offers to customers. Texts without
 * a date are never hidden.
 */
export function textDateHasPassed(text: string, now: Date = new Date()): boolean {
  const latest = latestDateInText(text);
  return latest !== null && latest.getTime() < now.getTime();
}

/**
 * A settings offer is active only while it is enabled AND its end date (when
 * set) has not passed yet. Expired offers must never keep showing a countdown
 * to a moment in the past.
 */
export function offerIsActive(
  enabled: boolean,
  endsAt: string | Date | null,
  now: Date = new Date(),
): boolean {
  if (!enabled) return false;
  if (!endsAt) return true;
  const endsAtMs = new Date(endsAt).getTime();
  if (Number.isNaN(endsAtMs)) return true;
  return endsAtMs > now.getTime();
}

export function isValidBdPhone(value: string): boolean {
  const phone = normalizePhone(value);
  return /^01[3-9]\d{8}$/.test(phone);
}

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
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
