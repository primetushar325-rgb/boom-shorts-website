"use client";

import { useState } from "react";

type Faq = { id: number; question: string; answer: string };

export default function FAQSection({ items }: { items: Faq[] }) {
  const [openId, setOpenId] = useState<number | null>(items[0]?.id ?? null);
  if (!items.length) return null;

  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-16">
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">FAQ</p>
        <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">Frequently Asked Questions</h2>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((f) => {
          const isOpen = openId === f.id;
          return (
            <div key={f.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              <button
                onClick={() => setOpenId(isOpen ? null : f.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-white sm:text-base">{f.question}</span>
                <span className={`text-amber-300 transition-transform ${isOpen ? "rotate-45" : ""}`}>+</span>
              </button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden px-5 pb-4 text-sm text-slate-400">{f.answer}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
