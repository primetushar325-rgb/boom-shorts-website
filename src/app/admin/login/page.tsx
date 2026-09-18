"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push("/admin");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm p-6">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold text-xl text-ink">
          🔐
        </div>
        <h1 className="mt-3 text-center text-lg font-extrabold text-warm">Admin sign in</h1>
        <p className="mt-1 text-center text-xs text-muted">
          Manage orders, packages, payments and reviews.
        </p>

        <div className="mt-5">
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input"
            placeholder="Enter admin password"
            autoComplete="current-password"
            required
          />
        </div>

        {error ? (
          <p className="mt-3 rounded-xl bg-bad-soft px-3 py-2 text-xs font-semibold text-bad">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={loading} className="btn-primary mt-5 w-full py-3">
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <Link href="/" className="btn-ghost mt-2 w-full py-2.5 text-xs">
          ← Back to website
        </Link>
      </form>
    </main>
  );
}
