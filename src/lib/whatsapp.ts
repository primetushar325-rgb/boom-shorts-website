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
 * Server-side automatic sending.
 *
 * WhatsApp has no free "send a message" API: the Cloud API requires a Meta
 * Business account plus a permanent access token and a sender phone number id.
 * When those are present we post the notification; when they are not, the
 * caller falls back to the prefilled link above. Nothing is hard-coded.
 *
 * Required env:
 *   WHATSAPP_CLOUD_TOKEN      permanent access token (secret)
 *   WHATSAPP_PHONE_NUMBER_ID  sender phone number id (not a secret, but config)
 * Optional:
 *   WHATSAPP_API_VERSION      default "v21.0"
 */
export function whatsappCloudConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsAppText(toPhone: string, body: string): Promise<boolean> {
  if (!whatsappCloudConfigured()) return false;

  const digits = normalizePhone(toPhone);
  if (!digits) return false;

  const version = process.env.WHATSAPP_API_VERSION || "v21.0";
  const url = `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: digits,
      type: "text",
      text: { body, preview_url: false },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[whatsapp] send failed (${res.status}):`, detail.slice(0, 300));
    return false;
  }
  return true;
}
