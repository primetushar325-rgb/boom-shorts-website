"use client";

import { useState } from "react";

export default function FAQSection({
  items,
}: {
  items: { id: number; question: string; answer: string }[];
}) {
  const [openId, setOpenId] = useState<number | null>(items[0]?.id ?? null);
  if (!items.length) return null;

  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-12">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-bs-primary">FAQ</p>
        <h2 className="mt-1 text-2xl font-extrabold text-bs-ink sm:text-3xl">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="mt-8 divide-y divide-bs-line overflow-hidden rounded-2xl border border-bs-line bg-white shadow-bs-card">
        {items.map((f) => {
          const open = openId === f.id;
          return (
            <div key={f.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : f.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-bold text-bs-ink">{f.question}</span>
                <span className={`text-bs-primary transition-transform ${open ? "rotate-45" : ""}`}>
                  +
                </span>
              </button>
              {open ? (
                <p className="animate-bs-fade-in px-5 pb-4 text-sm leading-relaxed text-bs-muted">
                  {f.answer}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
