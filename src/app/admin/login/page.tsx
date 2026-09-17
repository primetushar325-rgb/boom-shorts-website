"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Admin App sign-in.
 *
 * Email + password against `admin_users`. When no admin exists yet the page
 * switches to a one-time setup form — it is only reachable while the admin
 * table is empty, so it is not a public registration route.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/login")
      .then((r) => r.json())
      .then((d) => setNeedsSetup(Boolean(d.needsSetup)))
      .catch(() => setNeedsSetup(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (needsSetup && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(needsSetup ? "/api/auth/setup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign in failed");

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0b1220] px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0e1628] p-7 shadow-2xl"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bs-primary text-xl font-black text-white">
          BS
        </div>
        <h1 className="mt-4 text-center text-xl font-extrabold text-white">Boom Shorts Admin</h1>
        <p className="mt-1 text-center text-xs text-slate-400">
          {needsSetup === null
            ? "Checking…"
            : needsSetup
              ? "First-time setup — create your admin account."
              : "Sign in to manage your store."}
        </p>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              placeholder="admin@boomshorts.local"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-bs-primary"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={needsSetup ? "new-password" : "current-password"}
              required
              minLength={needsSetup ? 8 : undefined}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-bs-primary"
            />
          </label>

          {needsSetup ? (
            <>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Confirm Password
                </span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-bs-primary"
                />
              </label>
              <p className="text-[11px] leading-relaxed text-slate-500">
                At least 8 characters with one letter and one number.
              </p>
            </>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-red-500/15 px-3 py-2.5 text-xs font-semibold text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || needsSetup === null}
          className="mt-5 w-full rounded-xl bg-bs-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-bs-primary-dark disabled:opacity-60"
        >
          {loading ? "Please wait…" : needsSetup ? "Create Admin Account" : "Sign In"}
        </button>
      </form>
    </main>
  );
}
