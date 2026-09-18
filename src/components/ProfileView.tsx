"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Loader2,
  LogOut,
  ReceiptText,
  Star,
  UserRound,
} from "lucide-react";

type Customer = { id: number; name: string; phone: string; createdAt?: string };

/** Safety net so the button can never stay stuck in "Please wait…". */
const REQUEST_TIMEOUT_MS = 30_000;

/** Reads JSON, or explains a non-JSON (gateway) response honestly. */
async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return { error: `Server responded with ${res.status}. Please try again.` };
  }
}

export default function ProfileView() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Double-tap guard: state updates are async, this flips synchronously.
  const inFlight = useRef(false);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (watchdog.current) clearTimeout(watchdog.current);
    };
  }, []);

  async function loadMe() {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/customer/me", { cache: "no-store" });
      const data = await readJson(res);
      if (!alive.current) return;
      if (!res.ok) {
        setCustomer(null);
        setLoadError("Could not load your profile. Please try again.");
        return;
      }
      setCustomer((data.customer as Customer) ?? null);
    } catch {
      if (!alive.current) return;
      setCustomer(null);
      setLoadError("Network problem while loading your profile. Pull down to retry.");
    } finally {
      if (alive.current) setLoading(false);
    }
  }

  useEffect(() => {
    // Deferred to a microtask so the fetch (and its state updates) never runs
    // synchronously inside the effect body.
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadMe();
    });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");

    const digits = phone.replace(/\D/g, "");
    if (mode === "register" && !name.trim()) return setError("Please enter your name.");
    if (!/^01[3-9]\d{8}$/.test(digits)) {
      return setError("Please enter a valid WhatsApp number (01XXXXXXXXX).");
    }
    if (!/^\d{4,6}$/.test(pin)) return setError("Your PIN must be 4–6 digits.");

    inFlight.current = true;
    setBusy(true);
    watchdog.current = setTimeout(() => {
      inFlight.current = false;
      setBusy(false);
      setError("This is taking longer than usual. Please check your connection and try again.");
    }, REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`/api/customer/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), pin }),
      });
      const data = await readJson(res);

      if (!res.ok) {
        // A server rejection is reported as itself — never as "Network Problem".
        const message = typeof data.error === "string" && data.error.trim() ? data.error : "";
        setError(
          message ||
            (res.status === 429
              ? "Too many attempts. Please wait a few minutes and try again."
              : `We could not ${mode === "login" ? "sign you in" : "create your account"} (error ${res.status}).`),
        );
        if (data.exists === true) setMode("login");
        return;
      }

      setCustomer((data.customer as Customer) ?? null);
      setPin("");
    } catch {
      // Only a genuine transport failure reaches here.
      setError(
        "Network problem — the request did not reach our server. Please check your connection and try again.",
      );
    } finally {
      if (watchdog.current) clearTimeout(watchdog.current);
      watchdog.current = null;
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function logout() {
    if (inFlight.current) return;
    inFlight.current = true;
    setSigningOut(true);
    try {
      await fetch("/api/customer/logout", { method: "POST" });
      setCustomer(null);
      setMode("login");
      setPin("");
      setError("");
    } catch {
      // Even if the request fails, clear the local view; the cookie is httpOnly
      // and expires on its own.
      setCustomer(null);
    } finally {
      inFlight.current = false;
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <div className="card flex items-center justify-center gap-2 p-6 text-sm text-muted-2">
        <Loader2 size={16} className="animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  if (customer) {
    return (
      <div className="flex flex-col gap-3">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold text-ink">
              <UserRound size={22} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-warm">
                {customer.name || "Customer"}
              </p>
              <p className="truncate text-xs text-muted">{customer.phone}</p>
            </div>
          </div>
        </div>

        <Link href="/orders" className="row-tap">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold">
            <ReceiptText size={17} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-warm">My orders</span>
            <span className="block text-xs text-muted">Track status and payment of your orders</span>
          </span>
        </Link>

        <Link href="/reviews" className="row-tap">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold">
            <Star size={17} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-warm">Write a review</span>
            <span className="block text-xs text-muted">Share your experience with other buyers</span>
          </span>
        </Link>

        <button
          type="button"
          onClick={logout}
          disabled={signingOut}
          className="btn-outline w-full"
        >
          {signingOut ? (
            <Loader2 size={15} className="animate-spin" aria-hidden />
          ) : (
            <LogOut size={15} aria-hidden />
          )}
          {signingOut ? "Signing out…" : "Sign out"}
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
          aria-pressed={mode === "login"}
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
          aria-pressed={mode === "register"}
          className={`chip flex-1 justify-center ${mode === "register" ? "chip-active" : ""}`}
        >
          Create account
        </button>
      </div>

      {loadError ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-bad-soft px-3 py-2">
          <p className="text-xs font-semibold text-bad">{loadError}</p>
          <button type="button" onClick={loadMe} className="btn-ghost shrink-0 px-3 py-1.5 text-[11px]">
            Retry
          </button>
        </div>
      ) : null}

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
              autoComplete="name"
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
            autoComplete="tel"
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
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-bad-soft px-3 py-2 text-xs font-semibold text-bad"
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={busy} aria-busy={busy} className="btn-primary w-full py-3">
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>

        <p className="text-center text-[11px] leading-relaxed text-muted-2">
          {mode === "login"
            ? "Use the number and PIN you set when placing an order."
            : "Your PIN is stored encrypted and lets you see your own orders only."}
        </p>
      </form>

      <div className="card p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-2">
          Ordered without a PIN?
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          You can still track any order with your Order ID and WhatsApp number from the Orders tab.
        </p>
        <Link href="/orders" className="btn-outline mt-3 w-full py-2.5 text-xs">
          Track an order
        </Link>
      </div>
    </div>
  );
}
