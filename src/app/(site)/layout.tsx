import type { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { buildWhatsAppLink } from "@/lib/format";
import { getPublicSettings } from "@/lib/publicContent";

/**
 * The shell only needs the public WhatsApp link, so it does not have to be
 * force-dynamic. Individual private pages (orders, payment, profile, admin)
 * opt into dynamic rendering themselves.
 *
 * Settings come from the tagged cache layer: this layout wraps dynamic pages
 * such as /checkout/[id], and an uncached settings read here meant an extra
 * database round-trip on every single checkout navigation.
 */
export const revalidate = 300;

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const settings = await getPublicSettings();
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
