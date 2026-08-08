export function taka(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `৳${n.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
}

export function discountPercent(oldPrice: number | string | null | undefined, newPrice: number | string | null | undefined): number {
  const oldN = Number(oldPrice ?? 0);
  const newN = Number(newPrice ?? 0);
  if (!oldN || oldN <= newN) return 0;
  return Math.round(((oldN - newN) / oldN) * 100);
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function orderWhatsAppMessage(opts: {
  name: string;
  phone: string;
  packageName: string;
  price: number | string;
  transactionId: string;
}): string {
  return [
    "🛒 *New Order Confirmation*",
    "",
    `👤 Name: ${opts.name}`,
    `📱 Phone: ${opts.phone}`,
    `📦 Package: ${opts.packageName}`,
    `💰 Price: ${taka(opts.price)}`,
    `🧾 Transaction ID: ${opts.transactionId}`,
    "",
    "Please confirm my order. Thank you!",
  ].join("\n");
}
