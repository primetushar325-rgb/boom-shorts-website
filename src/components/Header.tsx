"use client";

import { useState } from "react";
import Link from "next/link";
import BrandLogo from "./BrandLogo";

const links = [
  { href: "/#boom-shorts", label: "Packages" },
  { href: "/#services", label: "Services" },
  { href: "/#reviews", label: "Reviews" },
  { href: "/#gallery", label: "Our Work" },
  { href: "/#faq", label: "FAQ" },
];

export default function Header({
  siteName,
  logoUrl,
  whatsappLink,
}: {
  siteName: string;
  logoUrl: string;
  whatsappLink?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur"
      style={{
        borderColor: "rgba(212,175,55,0.22)",
        background: "rgba(5,5,5,0.88)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <BrandLogo src={logoUrl} alt={siteName} size={52} priority className="sm:!h-14 sm:!w-14" />
          <span className="truncate text-base font-extrabold tracking-tight text-warm sm:text-lg">
            {siteName}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-warm-dim transition hover:text-gold"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {whatsappLink ? (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline hidden px-4 py-2.5 text-sm sm:inline-flex"
            >
              WhatsApp
            </a>
          ) : null}
          <a href="#boom-shorts" className="btn-gold btn-shine hidden sm:inline-flex">
            Order Now
          </a>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-xl border text-warm-dim transition hover:text-gold lg:hidden"
            style={{ borderColor: "rgba(212,175,55,0.3)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div
          className="border-t px-4 py-3 lg:hidden"
          style={{ borderColor: "rgba(212,175,55,0.18)", background: "#08080a" }}
        >
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-warm-dim transition hover:bg-coal/5 hover:text-gold"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#boom-shorts"
              onClick={() => setOpen(false)}
              className="btn-gold btn-shine mt-2"
            >
              Order Now
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
