"use client";

import { useState } from "react";

type Faq = { id: number; question: string; answer: string };

export default function FAQSection({ items }: { items: Faq[] }) {
  const [openId, setOpenId] = useState<number | null>(items[0]?.id ?? null);
  if (!items.length) return null;

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="mb-6 text-center">
        <p className="section-eyebrow">FAQ</p>
        <h2 className="section-title">Frequently Asked Questions</h2>
      </div>

      <div className="flex flex-col gap-2.5">
        {items.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div key={faq.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <span className="text-[13px] font-bold text-navy sm:text-sm">{faq.question}</span>
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition ${
                    isOpen ? "rotate-45 bg-blue-600 text-white" : ""
                  }`}
                  aria-hidden
                >
                  +
                </span>
              </button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden px-4 pb-4 text-[13px] leading-relaxed text-slate-600">
                  {faq.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
