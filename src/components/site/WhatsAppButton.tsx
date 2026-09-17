"use client";

import { useEffect, useRef, useState } from "react";
import { buildWhatsAppLink, helpWhatsAppMessage } from "@/lib/whatsapp";

/**
 * Floating WhatsApp help button.
 *
 * Replaces the old draggable "AI Voice" button, which has been removed from
 * Boom Shorts entirely. The number comes from Site Settings (admin-editable) —
 * nothing is hard-coded here.
 */
export default function WhatsAppButton({
  whatsappNumber,
  siteName,
}: {
  whatsappNumber: string;
  siteName: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const href = buildWhatsAppLink(whatsappNumber, helpWhatsAppMessage(siteName));

  return (
    <div
      ref={ref}
      className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 md:bottom-6 md:right-6"
    >
      {open ? (
        <div className="w-64 animate-bs-fade-up overflow-hidden rounded-2xl border border-bs-line bg-white shadow-bs-lift">
          <div className="flex items-center gap-2 bg-[#075E54] px-4 py-3 text-white">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-base">💬</span>
            <div>
              <p className="text-sm font-bold leading-tight">Need Help?</p>
              <p className="text-[11px] text-white/75">We reply within minutes</p>
            </div>
          </div>
          <div className="p-4">
            <p className="text-xs leading-relaxed text-bs-muted">
              Chat with us on WhatsApp for pricing, delivery time or any question about your order.
            </p>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="mt-3 block rounded-xl bg-[#25D366] px-4 py-2.5 text-center text-sm font-bold text-white transition hover:brightness-95"
            >
              Start Chat
            </a>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close WhatsApp help" : "Open WhatsApp help"}
        aria-expanded={open}
        className="animate-bs-pulse-ring grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-2xl text-white shadow-lg transition hover:scale-105"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
