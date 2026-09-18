import { MessageCircle } from "lucide-react";

/**
 * Floating WhatsApp action.
 *
 * It is a `position: fixed` element, so on a phone it inevitably passes over
 * page content while the user scrolls. Two things keep it from stealing taps:
 *
 *  1. it is a compact 48 px circle on small screens (the label only appears from
 *     `sm:` up, where there is a mouse and room for it), so the area it can cover
 *     is roughly a quarter of what the old pill covered;
 *  2. it sits directly above the bottom navigation, inside the reserved spacer
 *     the site layout adds, rather than floating over the middle of the content.
 *
 * The tap target is still comfortably above the 44 px minimum.
 */
export default function WhatsAppFloat({ href }: { href: string }) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-[76px] right-3 z-40 grid h-12 w-12 place-items-center rounded-full bg-[#25D366] text-white transition-transform duration-150 hover:bg-[#1eb955] active:scale-95 sm:bottom-6 sm:right-6 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-3.5 sm:text-sm sm:font-bold"
      style={{ boxShadow: "0 10px 26px -10px rgba(37, 211, 102, 0.85)" }}
    >
      <MessageCircle size={22} aria-hidden />
      <span className="hidden sm:inline">Chat on WhatsApp</span>
    </a>
  );
}
