import Link from "next/link";

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
    { href: whatsappLink, label: "WhatsApp" },
    { href: facebookLink, label: "Facebook" },
    { href: messengerLink, label: "Messenger" },
    { href: telegramLink, label: "Telegram" },
  ].filter((s) => s.href);

  return (
    <footer className="mt-16 border-t border-bs-line bg-white pb-24 md:pb-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-10 text-center">
        <p className="text-base font-extrabold text-bs-ink">{siteName}</p>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-bs-muted">
          <a href="#packages" className="hover:text-bs-primary">Packages</a>
          <a href="#reviews" className="hover:text-bs-primary">Reviews</a>
          <a href="#faq" className="hover:text-bs-primary">FAQ</a>
          <Link href="/orders" className="hover:text-bs-primary">My Orders</Link>
          <Link href="/free" className="hover:text-bs-primary">Free Videos</Link>
        </nav>

        {socials.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-bs-line px-3 py-1.5 text-xs font-semibold text-bs-ink transition hover:border-bs-primary hover:text-bs-primary"
              >
                {s.label}
              </a>
            ))}
          </div>
        ) : null}

        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} {siteName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
