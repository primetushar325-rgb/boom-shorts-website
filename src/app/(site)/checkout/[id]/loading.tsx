import { Loader2 } from "lucide-react";
import SitePageHeader from "@/components/SitePageHeader";
import { getPublicSettings } from "@/lib/publicContent";

/**
 * Instant feedback for the "Order Now" tap.
 *
 * /checkout/[id] is rendered on demand (prices must always come fresh from the
 * database), so without this file the router had nothing to show until the whole
 * server render finished. On a cold serverless function that was long enough for
 * customers to conclude the button was broken and tap it two or three more times
 * — each tap firing another request.
 *
 * With a loading boundary Next.js can also *prefetch* this shell, so the first
 * tap paints immediately and the real form streams in behind it.
 */
export default async function CheckoutLoading() {
  const settings = await getPublicSettings().catch(() => null);

  return (
    <main className="min-h-screen">
      <SitePageHeader
        title="Secure checkout"
        subtitle="Pay with bKash or Nagad, then submit your payment details below."
        backHref="/#boom-shorts"
        backLabel="Back"
        showLogo
        logoUrl={settings?.logoUrl}
        siteName={settings?.siteName ?? "Boom Shorts"}
      />
      <div className="px-4 py-5">
        <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex min-w-0 flex-col gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-52" />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <Skeleton className="h-56" />
            <div className="card flex items-center justify-center gap-2 p-8 text-sm text-muted">
              <Loader2 size={16} className="animate-spin" aria-hidden />
              Loading your package…
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-fade-in rounded-2xl ${className}`}
      style={{
        border: "1px solid rgba(212,175,55,0.14)",
        background: "linear-gradient(180deg,#121214 0%,#0b0b0d 100%)",
      }}
      aria-hidden
    />
  );
}
