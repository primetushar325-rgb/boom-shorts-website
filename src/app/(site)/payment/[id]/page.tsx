import { redirect } from "next/navigation";

/**
 * Legacy route kept so old links, bookmarks and any shared WhatsApp links keep
 * working. It forwards to the new checkout, which is the only place an order
 * can be created — the previous form here sent a client-computed price, which
 * is exactly what the new server-side pricing removed.
 */
export default async function LegacyPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/checkout/${encodeURIComponent(id)}`);
}
