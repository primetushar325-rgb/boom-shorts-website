"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrdersLookup({
  initial,
  to = "/orders",
}: {
  initial: string;
  /** Where to send the visitor — reused by /profile with its own prefix. */
  to?: string;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(initial ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = phone.trim();
    if (!value) return;
    router.push(`${to}?phone=${encodeURIComponent(value)}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-4 flex gap-2">
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Your WhatsApp number"
        inputMode="tel"
        aria-label="WhatsApp number"
        className="w-full rounded-xl border border-bs-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-bs-primary"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-bs-primary px-4 text-sm font-bold text-white transition hover:bg-bs-primary-dark"
      >
        Find
      </button>
    </form>
  );
}
