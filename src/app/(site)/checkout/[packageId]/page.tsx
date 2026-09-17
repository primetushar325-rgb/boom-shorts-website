import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getPackageById } from "@/lib/packages";
import { getSettings } from "@/lib/settings";
import { createUploadToken } from "@/lib/uploadToken";
import { priceBreakdown, taka } from "@/lib/pricing";
import YouTubeEmbed from "@/components/site/YouTubeEmbed";
import CheckoutForm from "./CheckoutForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ packageId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { packageId } = await params;
  const pkg = await getPackageById(Number(packageId));
  return { title: pkg ? `Checkout — ${pkg.name}` : "Checkout" };
}

export default async function CheckoutPage({ params }: Props) {
  const { packageId } = await params;
  const id = Number(packageId);
  if (!Number.isFinite(id)) notFound();

  const pkg = await getPackageById(id);
  if (!pkg) notFound();

  const s = await getSettings();
  const { base, discount, final, strikeThrough, percentOff } = priceBreakdown(pkg);
  const uploadToken = createUploadToken();

  return (
    <main className="min-h-screen bg-bs-bg pb-24 md:pb-12">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link
          href="/#packages"
          className="inline-flex items-center gap-1 text-sm font-semibold text-bs-muted transition hover:text-bs-primary"
        >
          ← Back to Packages
        </Link>

        <h1 className="mt-3 text-xl font-extrabold text-bs-ink sm:text-2xl">Checkout</h1>
        <p className="mt-1 text-sm text-bs-muted">
          Watch the demo, confirm the details, then complete your payment.
        </p>

        {/* ---------- 1. Demo video (16:9, from Supabase package data) ---------- */}
        {pkg.youtubeDemoUrl ? (
          <div className="mt-5">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-bs-muted">
              Demo Video
            </h2>
            <YouTubeEmbed url={pkg.youtubeDemoUrl} title={`${pkg.name} demo`} />
          </div>
        ) : null}

        {/* ---------- 2. Package information ---------- */}
        <section className="mt-5 rounded-2xl border border-bs-line bg-white p-5 shadow-bs-card">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                pkg.available ? "bg-bs-success-soft text-bs-success" : "bg-slate-100 text-slate-500"
              }`}
            >
              {pkg.available ? "Available" : "Unavailable"}
            </span>
            {pkg.isBestSeller ? (
              <span className="rounded-full bg-bs-gold-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bs-gold">
                ★ Best Seller
              </span>
            ) : null}
            {pkg.durationLabel ? (
              <span className="rounded-full bg-bs-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bs-primary">
                {pkg.durationLabel}
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 text-lg font-extrabold text-bs-ink">{pkg.name}</h2>
          {pkg.videoQuantity > 0 ? (
            <p className="mt-1 text-xs font-semibold text-slate-500">🎬 {pkg.videoQuantity} Videos</p>
          ) : null}
          {pkg.description || pkg.shortDescription ? (
            <p className="mt-2 text-sm leading-relaxed text-bs-muted">
              {pkg.description || pkg.shortDescription}
            </p>
          ) : null}

          {pkg.features.length > 0 ? (
            <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
              {pkg.features.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-sm text-slate-600">
                  <span className="mt-px text-bs-success">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-5 flex flex-wrap items-baseline gap-2 border-t border-bs-line pt-4">
            <span className="text-2xl font-extrabold text-bs-ink">{taka(final)}</span>
            {strikeThrough > final ? (
              <span className="text-sm text-slate-400 line-through">{taka(strikeThrough)}</span>
            ) : null}
            {percentOff > 0 ? (
              <span className="rounded-md bg-bs-danger-soft px-2 py-0.5 text-[11px] font-bold text-bs-danger">
                Save {percentOff}%
              </span>
            ) : null}
          </div>
          {discount > 0 ? (
            <p className="mt-1 text-xs font-semibold text-bs-success">
              Discount applied: −{taka(discount)}
            </p>
          ) : null}
        </section>

        {/* ---------- 3. Payment + order ---------- */}
        {pkg.available ? (
          <CheckoutForm
            uploadToken={uploadToken}
            pkg={{ id: pkg.id, name: pkg.name, finalPrice: final, basePrice: base }}
            settings={{
              siteName: s.siteName,
              whatsappNumber: s.whatsappNumber,
              bkashNumber: s.bkashNumber,
              nagadNumber: s.nagadNumber,
              paymentNotice: s.paymentNotice,
              qrCodeUrl: s.qrCodeUrl,
            }}
          />
        ) : (
          <div className="mt-5 rounded-2xl border border-bs-danger/20 bg-bs-danger-soft p-6 text-center">
            <p className="text-sm font-bold text-bs-danger">This package is currently unavailable</p>
            <p className="mt-1 text-xs text-slate-600">
              Please choose another package, or message us on WhatsApp to be notified when it returns.
            </p>
            <Link
              href="/#packages"
              className="mt-4 inline-block rounded-xl bg-bs-primary px-5 py-2.5 text-sm font-bold text-white"
            >
              Browse Packages
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
