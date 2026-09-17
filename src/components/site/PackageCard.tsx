import Link from "next/link";
import { priceBreakdown, taka } from "@/lib/pricing";

export type PackageCardData = {
  id: number;
  name: string;
  shortDescription: string;
  description: string;
  durationLabel: string;
  videoQuantity: number;
  newPrice: string;
  oldPrice: string | null;
  discountPercent: number;
  discountAmount: string;
  isBestSeller: boolean;
  badge: string;
  available: boolean;
  features: string[];
};

/**
 * Compact, premium package card.
 *
 * Deliberately short: duration, name, one-line blurb, quantity, up to five
 * feature ticks, price and CTA. The long description lives on the checkout
 * page, not on the grid.
 */
export default function PackageCard({ pkg }: { pkg: PackageCardData }) {
  const { final, strikeThrough, percentOff } = priceBreakdown(pkg);
  const unavailable = !pkg.available;
  const features = pkg.features.slice(0, 5);

  return (
    <article
      className={`group relative flex h-full flex-col rounded-2xl border bg-bs-surface p-4 shadow-bs-card transition duration-200 ${
        unavailable
          ? "border-bs-line opacity-90"
          : "border-bs-line hover:-translate-y-0.5 hover:border-bs-primary/40 hover:shadow-bs-lift"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            unavailable ? "bg-slate-100 text-slate-500" : "bg-bs-success-soft text-bs-success"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${unavailable ? "bg-slate-400" : "bg-bs-success"}`}
          />
          {unavailable ? "Unavailable" : "Available"}
        </span>

        {pkg.isBestSeller ? (
          <span className="rounded-full bg-bs-gold-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bs-gold">
            ★ Best Seller
          </span>
        ) : pkg.badge === "popular" ? (
          <span className="rounded-full bg-bs-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bs-primary">
            Popular
          </span>
        ) : pkg.badge === "new" ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
            New
          </span>
        ) : null}
      </div>

      {pkg.durationLabel ? (
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-bs-primary">
          {pkg.durationLabel}
        </p>
      ) : null}

      <h3 className="mt-1 text-base font-bold leading-snug text-bs-ink">{pkg.name}</h3>

      {(pkg.shortDescription || pkg.description) && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-bs-muted">
          {pkg.shortDescription || pkg.description}
        </p>
      )}

      {pkg.videoQuantity > 0 ? (
        <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
          🎬 {pkg.videoQuantity} Videos
        </p>
      ) : null}

      {features.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-bs-line pt-3">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-600">
              <span className="mt-px text-bs-success">✓</span>
              <span className="line-clamp-1">{f}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-xl font-extrabold text-bs-ink">{taka(final)}</span>
          {strikeThrough > final ? (
            <span className="text-xs font-medium text-slate-400 line-through">
              {taka(strikeThrough)}
            </span>
          ) : null}
          {percentOff > 0 ? (
            <span className="rounded-md bg-bs-danger-soft px-1.5 py-0.5 text-[10px] font-bold text-bs-danger">
              −{percentOff}%
            </span>
          ) : null}
        </div>

        {unavailable ? (
          <span className="mt-3 block cursor-not-allowed rounded-xl bg-slate-100 px-4 py-2.5 text-center text-xs font-bold text-slate-400">
            Currently Unavailable
          </span>
        ) : (
          <Link
            href={`/checkout/${pkg.id}`}
            className="mt-3 block rounded-xl bg-bs-primary px-4 py-2.5 text-center text-xs font-bold text-white transition hover:bg-bs-primary-dark active:scale-[0.99]"
          >
            Order Now
          </Link>
        )}
      </div>
    </article>
  );
}
