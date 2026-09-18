import PackageCard, { type PackageItem } from "./PackageCard";
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
    <section id={id} className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-6 text-center sm:mb-8">
        <p className="section-eyebrow">{eyebrow}</p>
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="section-sub">{subtitle}</p> : null}
        <div className="hair-gold mx-auto mt-5 w-40" aria-hidden />
      </div>

      {videoUrl ? <ScrollAutoplayVideo videoUrl={videoUrl} title={title} /> : null}

      {/* 2×2 on phones, 4 in a row on wide screens */}
      <div data-package-grid className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {packages.map((pkg, index) => (
          <PackageCard key={pkg.id} pkg={pkg} index={index} />
        ))}
      </div>
    </section>
  );
}
