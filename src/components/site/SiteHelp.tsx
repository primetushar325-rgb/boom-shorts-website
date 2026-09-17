import { getSettings } from "@/lib/settings";
import WhatsAppButton from "./WhatsAppButton";

/**
 * Site-wide floating WhatsApp help, rendered once from the root layout so it
 * appears on every customer page (home, checkout, order, orders, profile).
 *
 * The number comes from Site Settings and is admin-editable — nothing here is
 * hard-coded. Settings are loaded here rather than passed down so individual
 * pages don't each have to remember to render the button.
 */
export default async function SiteHelp() {
  const s = await getSettings().catch(() => null);
  if (!s?.whatsappNumber) return null;
  return <WhatsAppButton whatsappNumber={s.whatsappNumber} siteName={s.siteName} />;
}
