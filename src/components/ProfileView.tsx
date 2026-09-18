"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Customer = { id: number; name: string; phone: string; createdAt?: string };

export default function ProfileView() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadMe() {
    try {
      const res = await fetch("/api/customer/me", { cache: "no-store" });
      const data = await res.json();
      setCustomer(data.customer ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/customer/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setCustomer(data.customer);
      setPin("");
    } catch {
      setError("Network problem. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/customer/logout", { method: "POST" });
    setCustomer(null);
    setMode("login");
  }

  if (loading) {
    return <div className="card p-6 text-center text-sm text-slate-400">Loading…</div>;
  }

  if (customer) {
    return (
      <div className="flex flex-col gap-3">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-lg font-bold text-white">
              {(customer.name || customer.phone).slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-navy">
                {customer.name || "Customer"}
              </p>
              <p className="text-xs text-slate-500">{customer.phone}</p>
            </div>
          </div>
        </div>

        <Link href="/orders" className="row-tap">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
            🧾
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold text-navy">My orders</span>
            <span className="block text-xs text-slate-500">Track status and payment of your orders</span>
          </span>
          <span className="text-slate-300">›</span>
        </Link>

        <Link href="/reviews" className="row-tap">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
            ⭐
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold text-navy">Write a review</span>
            <span className="block text-xs text-slate-500">Share your experience with other buyers</span>
          </span>
          <span className="text-slate-300">›</span>
        </Link>

        <button type="button" onClick={logout} className="btn-outline w-full">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError("");
          }}
          className={`chip flex-1 justify-center ${mode === "login" ? "chip-active" : ""}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError("");
          }}
          className={`chip flex-1 justify-center ${mode === "register" ? "chip-active" : ""}`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={submit} className="card flex flex-col gap-3 p-4">
        {mode === "register" ? (
          <div>
            <label className="label" htmlFor="profile-name">
              Your name
            </label>
            <input
              id="profile-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              required
            />
          </div>
        ) : null}

        <div>
          <label className="label" htmlFor="profile-phone">
            WhatsApp number
          </label>
          <input
            id="profile-phone"
            className="input"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="01XXXXXXXXX"
            inputMode="tel"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="profile-pin">
            4–6 digit PIN
          </label>
          <input
            id="profile-pin"
            className="input"
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••"
            inputMode="numeric"
            required
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
        ) : null}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>

        <p className="text-center text-[11px] leading-relaxed text-slate-400">
          {mode === "login"
            ? "Use the number and PIN you set when placing an order."
            : "Your PIN is stored encrypted and lets you see your own orders only."}
        </p>
      </form>

      <div className="card p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Ordered without a PIN?</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          You can still track any order with your Order ID and WhatsApp number from the Orders tab.
        </p>
        <Link href="/orders" className="btn-outline mt-3 w-full py-2.5 text-xs">
          Track an order
        </Link>
      </div>
    </div>
  );
}
