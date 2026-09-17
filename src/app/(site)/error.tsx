"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Site-wide error boundary.
 *
 * Without this a database outage renders Next's raw stack-trace page, which
 * leaks internals and gives the customer no way forward. This shows a branded
 * message plus a retry that re-runs the failed render.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[site error]", error?.message ?? error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-bs-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-bs-line bg-white p-8 text-center shadow-bs-card">
        <p className="text-4xl">⚠️</p>
        <h1 className="mt-3 text-lg font-extrabold text-bs-ink">Something went wrong</h1>
        <p className="mt-2 text-sm leading-relaxed text-bs-muted">
          We could not load this page. This is usually temporary — please try again.
        </p>
        {error?.digest ? (
          <p className="mt-2 text-[11px] text-bs-muted">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-bs-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-bs-primary-dark"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-bs-line px-5 py-2.5 text-sm font-bold text-bs-ink transition hover:border-bs-primary/40"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
