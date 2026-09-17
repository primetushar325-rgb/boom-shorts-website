/**
 * Order and payment status vocabulary.
 *
 * Deliberately free of any database import so that client components can share
 * the exact same labels as the server without pulling `pg` into the browser
 * bundle. `src/lib/orders.ts` re-exports these.
 */

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
  "rejected",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Payment Verification",
  confirmed: "Payment Confirmed",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

export const PAYMENT_STATUSES = ["unverified", "confirmed", "rejected", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unverified: "Unverified",
  confirmed: "Confirmed",
  rejected: "Rejected",
  refunded: "Refunded",
};

export const PAYMENT_METHODS = ["bKash", "Nagad"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === "string" && (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value);
}

/** BBS-102948 */
export function formatOrderNumber(n: number): string {
  return `BBS-${String(n).padStart(6, "0")}`;
}
