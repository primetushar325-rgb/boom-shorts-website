"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, PackageX, RotateCw } from "lucide-react";

/**
 * Shown when the checkout Server Component could not read the package.
 *
 * This replaces the generic root `error.tsx` screen for *temporary* load
 * failures. Reaching an error boundary meant the customer saw "Something went
 * wrong" with no way to tell a two-second database blip from a real problem,
 * and `reset()` re-mounted the boundary rather than re-running the route.
 *
 * Why `router.refresh()` and not a reload:
 *  - /checkout/[id] is `force-dynamic`, so refresh re-executes the Server
 *    Component and therefore genuinely re-runs the package query. It is a real
 *    retry, not a repaint of the same broken state.
 *  - it is a plain GET of the route — it can never create an order, so the
 *    duplicate-order protection and idempotency in `lib/orders` are untouched.
 *  - running it inside `startTransition` gives an `isPending` that resolves on
 *    its own when the new payload lands, so the button cannot get stuck in its
 *    spinner state (the failure mode a bare `useState` flag has here, because
 *    React preserves client state across a refresh).
 */
export default function CheckoutLoadFailure({ packageId }: { packageId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRetry() {
    // Ignore extra taps while a retry is already in flight.
    if (isPending) return;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="card mx-auto w-full max-w-sm p-6 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-bad-soft text-bad">
        <PackageX size={22} aria-hidden />
      </div>

      <h2 className="mt-3 text-lg font-extrabold text-warm">Unable to load this package</h2>
      <p className="mt-1.5 text-sm text-muted">
        We could not reach our database just now. Your order has <strong>not</strong> been placed and
        nothing was charged — this is usually a momentary connection problem.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRetry}
          disabled={isPending}
          aria-busy={isPending}
          className="btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? (
            <>
              <Loader2 size={15} className="animate-spin" aria-hidden />
              Loading…
            </>
          ) : (
            <>
              <RotateCw size={15} aria-hidden />
              Try again
            </>
          )}
        </button>

        <Link href="/#boom-shorts" className="btn-outline w-full">
          Back to packages
        </Link>
      </div>

      {/* Never rendered as a data attribute or query string — purely a11y/telemetry. */}
      <p className="mt-4 text-[11px] text-muted-2" aria-live="polite">
        {isPending ? "Reconnecting to the database…" : `Package reference: #${packageId}`}
      </p>
    </div>
  );
}
