"use client";

import { useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/#packages", label: "Packages" },
  { href: "/#reviews", label: "Reviews" },
  { href: "/#faq", label: "FAQ" },
  { href: "/orders", label: "My Orders" },
];

export default function Header({ siteName, logoUrl }: { siteName: string; logoUrl: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-bs-line bg-white/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={siteName}
              className="h-9 w-9 rounded-xl border border-bs-line object-cover"
              width={36}
              height={36}
            />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-bs-primary text-sm font-black text-white">
              BS
            </span>
          )}
          <span className="text-sm font-extrabold tracking-tight text-bs-ink sm:text-base">
            {siteName}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-bs-muted transition hover:text-bs-primary"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <a
          href="#packages"
          className="hidden rounded-xl bg-bs-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-bs-primary-dark md:inline-block"
        >
          Order Now
        </a>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="grid h-9 w-9 place-items-center rounded-lg border border-bs-line text-bs-ink md:hidden"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open ? (
        <div className="border-t border-bs-line bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 text-sm font-medium text-bs-ink hover:bg-bs-primary-soft"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
