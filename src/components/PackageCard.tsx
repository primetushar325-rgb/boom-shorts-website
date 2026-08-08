import Link from "next/link";
import { taka, discountPercent } from "@/lib/format";

export type PackageItem = {
  id: number;
  name: string;
  description: string;
  oldPrice: string | null;
  newPrice: string;
  badge: string;
  buttonText: string;
  icon: string;
  recentlyAdded: boolean;
};

const badgeStyles: Record<string, string> = {
  popular: "bg-amber-500 text-slate-950",
  bestseller: "bg-amber-400 text-white",
  new: "bg-emerald-500 text-white",
};

const badgeLabels: Record<string, string> = {
  popular: "⭐ Popular",
  bestseller: "🔥 Best Seller",
  new: "✨ New",
};

export default function PackageCard({ pkg }: { pkg: PackageItem }) {
  const pct = discountPercent(pkg.oldPrice, pkg.newPrice);
  const save = pkg.oldPrice ? Number(pkg.oldPrice) - Number(pkg.newPrice) : 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur transition duration-300 hover:-translate-y-2 hover:border-amber-300/40 hover:shadow-2xl hover:shadow-amber-400/10">
      <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
        {pkg.badge !== "none" && badgeLabels[pkg.badge] ? (
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold shadow ${badgeStyles[pkg.badge]}`}>
            {badgeLabels[pkg.badge]}
          </span>
        ) : null}
        {pkg.recentlyAdded ? (
          <span className="rounded-full bg-sky-500 px-3 py-1 text-[11px] font-bold text-white shadow">
            🆕 Recently Added
          </span>
        ) : null}
      </div>

      <div className="text-4xl">{pkg.icon}</div>
      <h3 className="mt-4 text-xl font-extrabold text-white">{pkg.name}</h3>

      <div className="mt-4 flex items-end gap-2">
        {pkg.oldPrice && Number(pkg.oldPrice) > Number(pkg.newPrice) ? (
          <span className="text-base font-medium text-slate-500 line-through">{taka(pkg.oldPrice)}</span>
        ) : null}
        <span className="text-3xl font-extrabold text-amber-300">{taka(pkg.newPrice)}</span>
        {pct > 0 ? (
          <span className="mb-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-300">
            -{pct}%
          </span>
        ) : null}
      </div>

      {save > 0 ? (
        <p className="mt-1 text-xs font-semibold text-emerald-400">You Save {taka(save)}!</p>
      ) : null}

      <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-400">{pkg.description}</p>

      <Link
        href={`/payment/${pkg.id}`}
        className="mt-6 block rounded-full bg-gradient-to-r from-amber-400 to-yellow-600 px-5 py-3 text-center text-sm font-bold text-white shadow-lg shadow-amber-400/20 transition group-hover:shadow-amber-400/40 hover:scale-[1.02]"
      >
        {pkg.buttonText}
      </Link>
    </div>
  );
}
