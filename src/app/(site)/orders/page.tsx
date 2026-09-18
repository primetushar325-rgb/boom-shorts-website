import type { Metadata } from "next";
import SitePageHeader from "@/components/SitePageHeader";
import OrdersView from "@/components/OrdersView";
import { ensureSchema } from "@/db/ensureSchema";
import { buildWhatsAppLink } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Orders",
  description: "Track your Boom Shorts orders, payment status and delivery progress.",
  robots: { index: false, follow: true },
};

export default async function OrdersPage() {
  await ensureSchema();
  const settings = await getSettings();
  const whatsappLink =
    settings.whatsappLink ||
    buildWhatsAppLink(settings.whatsappNumber, "Hi, I have a question about my order.");

  return (
    <main className="min-h-screen">
      <SitePageHeader
        title="My Orders"
        subtitle="See only your own orders, payment status and progress."
      />
      <div className="mx-auto max-w-2xl px-4 py-5">
        <OrdersView whatsappNumber={settings.whatsappNumber || whatsappLink} />
      </div>
    </main>
  );
}
