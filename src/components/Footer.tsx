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
  ].filter((item) => item.href);

  return (
    <footer className="mt-8 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-base font-extrabold text-navy">{siteName}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Premium Boom Shorts, voice over videos, thumbnails and YouTube channel management.
            Order online — pay with bKash or Nagad.
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Quick links</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600">
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
            <Link href="/orders" className="hover:text-blue-600">
              My Orders
            </Link>
            <Link href="/reviews" className="hover:text-blue-600">
              Reviews
            </Link>
            <Link href="/free" className="hover:text-blue-600">
              Free Videos
            </Link>
            <Link href="/profile" className="hover:text-blue-600">
              Profile
            </Link>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Support</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="chip hover:border-blue-300 hover:text-blue-700"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-4 text-center text-[11px] text-slate-400">
        © {new Date().getFullYear()} {siteName}. All rights reserved.
      </div>
    </footer>
  );
}
