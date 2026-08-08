import PackageCard, { PackageItem } from "./PackageCard";
import ScrollAutoplayVideo from "./ScrollAutoplayVideo";

export default function PackagesSection({
  id,
  eyebrow,
  title,
  subtitle,
  packages,
  videoUrl,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  packages: PackageItem[];
  videoUrl?: string;
}) {
  if (!packages.length) return null;

  return (
    <section id={id} className="mx-auto max-w-7xl px-5 py-16">
      <div className="mb-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400 sm:text-base">{subtitle}</p>
      </div>

      {videoUrl ? <ScrollAutoplayVideo videoUrl={videoUrl} title={title} /> : null}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {packages.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>
    </section>
  );
}
