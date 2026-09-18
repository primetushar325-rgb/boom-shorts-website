import type { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { buildWhatsAppLink } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const settings = await getSettings();
  const whatsappLink =
    settings.whatsappLink ||
    buildWhatsAppLink(settings.whatsappNumber, "Hi, I want to order a Boom Shorts package.");

  return (
    <>
      {children}
      <WhatsAppFloat href={whatsappLink} />
      <BottomNav />
      {/* keeps page content clear of the fixed bottom navigation */}
      <div className="h-[68px]" aria-hidden />
    </>
  );
}
