import Link from "next/link";
import { computePackagePricing } from "@/lib/pricing";
import { taka } from "@/lib/format";

export type PackageItem = {
  id: number;
  name: string;
  description: string;
  oldPrice: string | null;
  newPrice: string;
  discountType: string;
  discountValue: string;
  badge: string;
  bestSeller: boolean;
  buttonText: string;
  icon: string;
  quantityLabel: string;
  features: unknown;
  demoVideoUrl: string;
  available: boolean;
  recentlyAdded: boolean;
};

function featureList(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  return features
    .map((item) => (typeof item === "string" ? item : String((item as { text?: string })?.text ?? "")))
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PackageCard({ pkg, index = 0 }: { pkg: PackageItem; index?: number }) {
  const pricing = computePackagePricing(pkg);
  const features = featureList(pkg.features);
  const isBestSeller = pkg.bestSeller || pkg.badge === "bestseller";
  const href = `/checkout/${pkg.id}`;
  const shineDelay = index % 3 === 1 ? "btn-shine-delay-1" : index % 3 === 2 ? "btn-shine-delay-2" : "";

  return (
    <article
      className={`${isBestSeller ? "card-gold" : "card"} card-hover relative flex flex-col overflow-hidden p-3 sm:p-4`}
    >
      <div className="flex flex-wrap items-start gap-1.5">
        {pkg.available ? (
          <span className="badge-available">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Available
          </span>
        ) : (
          <span className="badge-unavailable">Unavailable</span>
        )}
        {isBestSeller ? <span className="badge-bestseller">★ Best Seller</span> : null}
        {pkg.badge === "new" || pkg.recentlyAdded ? <span className="badge-info">New</span> : null}
        {pricing.discountPercent > 0 ? (
          <span className="badge-discount">-{pricing.discountPercent}%</span>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-xl sm:text-2xl" aria-hidden>
          {pkg.icon}
        </span>
        <h3 className="text-[15px] font-extrabold leading-tight text-warm sm:text-base">
          {pkg.name}
        </h3>
      </div>

      {pkg.description ? (
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-muted sm:text-[13px]">
          {pkg.description}
        </p>
      ) : null}

      {pkg.quantityLabel ? (
        <p
          className="mt-2 inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-warm-dim"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          ⏱ {pkg.quantityLabel}
        </p>
      ) : null}

      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="price-new">{taka(pricing.finalPrice)}</span>
        {pricing.discountAmount > 0 ? (
          <span className="price-old">{taka(pricing.originalPrice)}</span>
        ) : null}
      </div>
      {pricing.discountAmount > 0 ? (
        <p className="mt-0.5 text-[11px] font-bold text-bad">Save {taka(pricing.discountAmount)}</p>
      ) : null}

      {features.length > 0 ? (
        <ul className="mt-3 flex flex-1 flex-col gap-1.5">
          {features.slice(0, 6).map((feature) => (
            <li key={feature} className="feature-tick">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#d4af37"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              >
                <path d="m5 13 4 4L19 7" />
              </svg>
              <span className="line-clamp-2">{feature}</span>
            </li>
          ))}
          {features.length > 6 ? (
            <li className="pl-5 text-[11px] font-semibold text-muted-2">
              +{features.length - 6} more
            </li>
          ) : null}
        </ul>
      ) : (
        <div className="flex-1" />
      )}

      <div className="mt-3.5 flex flex-col gap-2">
        {pkg.available ? (
          <Link href={href} className={`btn-gold btn-shine ${shineDelay} w-full py-2.5 text-[13px]`}>
            {pkg.buttonText || "Order Now"}
          </Link>
        ) : (
          <span
            className="btn w-full cursor-not-allowed py-2.5 text-[13px] text-muted-2"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            Currently Unavailable
          </span>
        )}
        {pkg.demoVideoUrl ? (
          <Link href={href} className="text-center text-[11px] font-semibold text-gold hover:underline">
            ▶ Watch demo video
          </Link>
        ) : null}
      </div>
    </article>
  );
}
