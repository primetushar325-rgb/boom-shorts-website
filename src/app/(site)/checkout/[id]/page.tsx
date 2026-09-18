import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { packages } from "@/db/schema";
import { computePackagePricing } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import CheckoutForm from "@/components/CheckoutForm";
import SitePageHeader from "@/components/SitePageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) notFound();

  await ensureSchema();

  const rows = await db.select().from(packages).where(eq(packages.id, idNum)).limit(1);
  const pkg = rows[0];
  if (!pkg) notFound();

  const settings = await getSettings();
  const pricing = computePackagePricing(pkg);
  const features = Array.isArray(pkg.features)
    ? (pkg.features as unknown[]).map((item) => String(item)).filter(Boolean)
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
            name: pkg.name,
            description: pkg.description,
            icon: pkg.icon,
            quantityLabel: pkg.quantityLabel,
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
