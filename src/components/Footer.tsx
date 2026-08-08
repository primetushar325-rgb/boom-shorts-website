export default function Footer({
  siteName,
  whatsappLink,
  facebookLink,
  messengerLink,
  telegramLink,
}: {
  siteName: string;
  whatsappLink: string;
  facebookLink: string;
  messengerLink: string;
  telegramLink: string;
}) {
  const socials = [
    { href: whatsappLink, label: "WhatsApp", icon: "🟢" },
    { href: facebookLink, label: "Facebook", icon: "📘" },
    { href: messengerLink, label: "Messenger", icon: "💬" },
    { href: telegramLink, label: "Telegram", icon: "✈️" },
  ].filter((s) => s.href);

  return (
    <footer className="border-t border-white/10 bg-slate-950 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 text-center">
        <p className="text-lg font-extrabold text-white">{siteName}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:border-amber-300/40 hover:text-white"
            >
              <span>{s.icon}</span> {s.label}
            </a>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} {siteName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
