import Link from "next/link";
import { PackageX } from "lucide-react";

/**
 * Checkout-scoped not-found state.
 *
 * Reached only when the package query *succeeded* and returned no row, or when
 * the id in the URL was never a valid package id. A database failure must never
 * land here — telling a customer their package does not exist because of a
 * connection blip would be a lie, so that path renders
 * `CheckoutLoadFailure` instead.
 */
export default function PackageNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="card w-full max-w-sm p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold-soft text-gold">
          <PackageX size={22} aria-hidden />
        </div>
        <h1 className="mt-3 text-lg font-extrabold text-warm">Package not found</h1>
        <p className="mt-1.5 text-sm text-muted">
          This package is no longer available. Please pick another one from the list.
        </p>
        <Link href="/#boom-shorts" className="btn-primary mt-5 w-full">
          Back to packages
        </Link>
      </div>
    </main>
  );
}
