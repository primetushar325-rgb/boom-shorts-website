export const ADMIN_COOKIE = "mbs_admin_session";
export const CUSTOMER_COOKIE = "mbs_customer_session";

export const ORDER_STATUSES = [
  "pending",
  "payment_verified",
  "processing",
  "completed",
  "cancelled",
  "rejected",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  payment_verified: "Payment Verified",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

export const PAYMENT_STATUSES = ["pending", "verified", "rejected"] as const;

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;

export const PAYMENT_METHODS = ["bKash", "Nagad", "Rocket"] as const;

export const MAX_ORDER_QUANTITY = 20;

/** Bucket that stores customer payment screenshots (private, admin-only). */
export const PAYMENT_BUCKET = "payment-screenshots";
/** Bucket that stores public site images (logos, banners, gallery…). */
export const PUBLIC_BUCKET = "site-images";
