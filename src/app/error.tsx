"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Technical detail stays on the server / console, never on the screen.
    console.error("Page error:", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="card w-full max-w-sm p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-2xl">
          ⚠️
        </div>
        <h1 className="mt-3 text-lg font-extrabold text-navy">Something went wrong</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Please try again. If the problem continues, message us on WhatsApp.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={reset} className="btn-primary w-full">
            Try again
          </button>
          <Link href="/" className="btn-outline w-full">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
