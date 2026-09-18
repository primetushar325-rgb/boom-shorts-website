import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Legacy checkout URL (existed before the redesign) — kept so old links, QR
 * codes and bookmarks keep working. It simply forwards to /checkout/[id].
 */
export default async function LegacyPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/checkout/${id}`);
}
