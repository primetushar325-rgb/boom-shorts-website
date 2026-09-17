/**
 * WhatsApp helpers.
 *
 * The project's original notification flow — build a prefilled wa.me link and
 * let the customer tap send — is preserved, because it needs no external API
 * key and already works. The message now carries the order number and status.
 */

export type WhatsAppOrderMessage = {
  orderNumber: string;
  customerName: string;
  whatsapp: string;
  packageName: string;
  /** e.g. "30 Shorts" or a duration label — omitted when unknown */
  quantity?: string | null;
  amount: string;
  paymentMethod: string;
  transactionId: string;
  statusLabel: string;
};

/** Normalises a phone number to international digits (BD default). */
export function normalizePhone(phone: string, defaultCountryCode = "880"): string {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  // 01XXXXXXXXX -> 8801XXXXXXXXX
  if (digits.startsWith("0") && digits.length === 11) digits = defaultCountryCode + digits.slice(1);
  // 1XXXXXXXXX (10 digits, no country code) -> 8801XXXXXXXXX
  else if (digits.length === 10 && digits.startsWith("1")) digits = defaultCountryCode + digits;
  return digits;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = normalizePhone(phone);
  const text = encodeURIComponent(message);
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function orderWhatsAppMessage(o: WhatsAppOrderMessage): string {
  return [
    "🛒 *New Boom Shorts Order*",
    "",
    `🧾 Order ID: ${o.orderNumber}`,
    `👤 Name: ${o.customerName}`,
    `📱 WhatsApp: ${o.whatsapp}`,
    `📦 Package: ${o.packageName}`,
    ...(o.quantity ? [`🔢 Quantity: ${o.quantity}`] : []),
    `💰 Amount: ${o.amount}`,
    `💳 Payment: ${o.paymentMethod}`,
    `🔖 Transaction ID: ${o.transactionId}`,
    `📌 Status: ${o.statusLabel}`,
    "",
    "Please verify my payment and confirm the order. Thank you!",
  ].join("\n");
}

/** Short "need help?" deep link used by the floating WhatsApp button. */
export function helpWhatsAppMessage(siteName: string): string {
  return `Assalamu Alaikum! I need help regarding ${siteName}.`;
}

/**
 * There is deliberately NO server-side "send a WhatsApp message" here.
 *
 * WhatsApp has no free send API — the Cloud API needs a Meta Business account,
 * a paid/persistent token and a sender phone-number id. Boom Shorts uses the
 * free click-to-chat flow instead: the customer taps "Send on WhatsApp" on the
 * order page and their own WhatsApp opens with the full order details already
 * written out, addressed to the business number from Site Settings. No paid
 * service, no token, nothing to configure.
 */
