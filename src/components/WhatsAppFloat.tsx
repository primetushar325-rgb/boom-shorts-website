export default function WhatsAppFloat({ href }: { href: string }) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#1eb955] active:scale-95 sm:bottom-6 sm:right-6"
      style={{ boxShadow: "0 12px 30px -10px rgba(37, 211, 102, 0.85)" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.35-.53.06-1.02.08-1.63-.13a11.3 11.3 0 0 1-3.6-2.2 12.4 12.4 0 0 1-2.5-3.34c-.26-.53-.42-1.13-.27-1.7.15-.57.7-1.24 1.05-1.4.25-.12.6-.1.83-.09.24.01.36.04.52.4.16.36.55 1.36.6 1.46.05.1.08.22.01.35-.07.13-.13.21-.26.35l-.28.33c-.09.11-.2.23-.09.45.11.22.5.86 1.07 1.4.73.7 1.35.92 1.56 1.03.21.1.34.09.47-.05.13-.14.53-.62.67-.83.14-.21.28-.17.47-.1.19.07 1.2.57 1.4.67.21.1.35.15.4.24.05.09.05.53-.19 1.21Z" />
      </svg>
      <span className="hidden sm:inline">Chat on WhatsApp</span>
    </a>
  );
}
