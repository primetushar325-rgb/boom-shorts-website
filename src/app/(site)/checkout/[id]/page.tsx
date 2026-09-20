import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { packages } from "@/db/schema";
import { computePackagePricing } from "@/lib/pricing";
import { cleanLabel } from "@/lib/format";
import { getPublicSettings, type PublicSettings } from "@/lib/publicContent";
import { withDbRetry } from "@/lib/dbRetry";
import CheckoutForm from "@/components/CheckoutForm";
import CheckoutLoadFailure from "@/components/CheckoutLoadFailure";
import SitePageHeader from "@/components/SitePageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

type PackageRow = typeof packages.$inferSelect;

/**
 * Result of reading the package for this checkout.
 *
 * "missing" and "unavailable" are kept strictly apart: a package that does not
 * exist is a not-found, while a package we could not *read* is a retryable
 * outage. Collapsing them is what would let a connection blip tell a customer
 * their package does not exist.
 */
type CheckoutLoad =
  | { status: "ready"; pkg: PackageRow; settings: PublicSettings }
  | { status: "missing"; settings: PublicSettings | null }
  | { status: "unavailable"; settings: PublicSettings | null };

async function loadCheckout(idNum: number): Promise<CheckoutLoad> {
  // Package row + settings in parallel, and settings from the tagged cache —
  // this page is where every "Order Now" tap lands, so every millisecond of
  // serial database work here is felt as a dead button.
  //
  // Both reads are guarded. Previously a single rejected query escaped this
  // Server Component, was serialized into the RSC flight stream and raised the
  // root error boundary, so a customer who tapped "Order Now" on a phone landed
  // on "Something went wrong". A direct GET often looked fine in tests because
  // it hit a cold serverless instance with a freshly built connection pool,
  // while the phone hit a warm instance whose pooled sockets the Supabase
  // pooler had already dropped. `withDbRetry` discards the dead socket and
  // tries once more, which is enough for that race; if the database is really
  // unreachable we render an honest retryable fallback instead of throwing.
  try {
    const [rows, settings] = await Promise.all([
      withDbRetry(
        () => db.select().from(packages).where(eq(packages.id, idNum)).limit(1),
        { label: "checkout package read" },
      ),
      withDbRetry(() => getPublicSettings(), { label: "checkout settings read" }),
    ]);

    const pkg = rows[0];
    if (!pkg) return { status: "missing", settings };
    return { status: "ready", pkg, settings };
  } catch (error) {
    // Only the message: never the query parameters, and never the connection
    // string (which is not part of the message anyway).
    console.error(
      "[checkout] package load failed after retry:",
      error instanceof Error ? error.message : String(error),
    );
    // The settings read may have succeeded even though the package read did
    // not, so keep whatever we have for the page header.
    const settings = await getPublicSettings().catch(() => null);
    return { status: "unavailable", settings };
  }
}

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) notFound();

  await ensureSchema();

  const load = await loadCheckout(idNum);

  if (load.status === "missing") notFound();

  if (load.status === "unavailable") {
    // Same chrome as the real page so the customer stays oriented, and no
    // error boundary — this is a temporary condition, not a crash.
    return (
      <main className="min-h-screen">
        <SitePageHeader
          title="Secure checkout"
          subtitle="Pay with bKash or Nagad, then submit your payment details below."
          backHref="/#boom-shorts"
          backLabel="Back"
          showLogo
          logoUrl={load.settings?.logoUrl}
          siteName={load.settings?.siteName ?? "Boom Shorts"}
        />
        <div className="px-4 py-5">
          <CheckoutLoadFailure packageId={idNum} />
        </div>
      </main>
    );
  }

  const { pkg, settings } = load;

  const pricing = computePackagePricing(pkg);
  const features = Array.isArray(pkg.features)
    ? (pkg.features as unknown[])
        .map((item) => (typeof item === "string" ? item : String((item as { text?: string })?.text ?? "")))
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return (
    <main className="min-h-screen">
      <SitePageHeader
        title="Secure checkout"
        subtitle="Pay with bKash or Nagad, then submit your payment details below."
        backHref="/#boom-shorts"
        backLabel="Back"
        showLogo
        logoUrl={settings.logoUrl}
        siteName={settings.siteName}
      />
      <div className="px-4 py-5">
        {!pkg.available ? (
          <p className="mx-auto mb-4 max-w-4xl rounded-xl bg-bad-soft px-4 py-3 text-xs font-semibold text-bad">
            This package is currently unavailable. Please choose another package or contact us on
            WhatsApp.
          </p>
        ) : null}
        <CheckoutForm
          pkg={{
            id: pkg.id,
            name: cleanLabel(pkg.name),
            description: pkg.description,
            icon: pkg.icon,
            quantityLabel: cleanLabel(pkg.quantityLabel),
            features,
            demoVideoUrl: pkg.demoVideoUrl,
            unitOriginal: pricing.originalPrice,
            unitFinal: pricing.finalPrice,
            discountAmount: pricing.discountAmount,
            discountPercent: pricing.discountPercent,
            available: pkg.available,
          }}
          settings={{
            siteName: settings.siteName,
            whatsappNumber: settings.whatsappNumber,
            bkashNumber: settings.bkashNumber,
            nagadNumber: settings.nagadNumber,
            rocketNumber: settings.rocketNumber,
            qrCodeUrl: settings.qrCodeUrl,
            paymentNotice: settings.paymentNotice,
          }}
        />
      </div>
    </main>
  );
}
