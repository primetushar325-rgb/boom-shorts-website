import AnimatedCounter from "./AnimatedCounter";

export default function Hero({
  badgeText,
  title,
  subtitle,
  stats,
}: {
  badgeText: string;
  title: string;
  subtitle: string;
  stats: { label: string; value: string }[];
}) {
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-bs-primary-soft to-transparent"
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-10 text-center sm:pt-14">
        <span className="inline-flex items-center gap-2 rounded-full border border-bs-primary/20 bg-bs-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-bs-primary">
          {badgeText}
        </span>

        <h1 className="mx-auto mt-4 max-w-3xl text-[clamp(1.7rem,5vw,2.9rem)] font-extrabold leading-tight text-bs-ink">
          {title}
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-bs-muted sm:text-base">
          {subtitle}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#packages"
            className="rounded-xl bg-bs-primary px-6 py-3 text-sm font-bold text-white shadow-bs-card transition hover:bg-bs-primary-dark"
          >
            View Packages
          </a>
          <a
            href="#reviews"
            className="rounded-xl border border-bs-line bg-white px-6 py-3 text-sm font-bold text-bs-ink transition hover:border-bs-primary hover:text-bs-primary"
          >
            See Reviews
          </a>
        </div>

        <dl className="mx-auto mt-9 grid max-w-lg grid-cols-3 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-bs-line bg-white px-2 py-4 shadow-bs-card"
            >
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span className="block text-lg font-extrabold text-bs-ink sm:text-2xl">
                  <AnimatedCounter value={s.value} />
                </span>
                <span className="mt-0.5 block text-[10px] font-medium text-bs-muted sm:text-xs">
                  {s.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
