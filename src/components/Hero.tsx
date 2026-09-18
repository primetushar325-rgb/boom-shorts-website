import AnimatedCounter from "./AnimatedCounter";
import CountdownTimer from "./CountdownTimer";

export default function Hero({
  badgeText,
  title,
  subtitle,
  stats,
  offer,
  freeVideoLink,
}: {
  badgeText: string;
  title: string;
  subtitle: string;
  stats: { label: string; value: string }[];
  offer: { enabled: boolean; text: string; endsAt: string | null };
  freeVideoLink?: string;
}) {
  return (
    <section id="home" className="relative overflow-hidden border-b border-slate-200 bg-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-70"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, rgba(37,99,235,0.14) 0%, rgba(37,99,235,0) 70%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-5xl px-4 pb-10 pt-10 text-center sm:pb-14 sm:pt-16">
        {badgeText ? (
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">
            <span className="truncate">{badgeText}</span>
          </span>
        ) : null}

        <h1 className="mt-5 text-[clamp(1.8rem,6vw,3.4rem)] font-extrabold leading-[1.12] tracking-tight text-navy">
          {title}
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {subtitle}
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a href="#boom-shorts" className="btn-primary px-6 py-3 text-[15px]">
            View Packages
          </a>
          <a href="/demo" className="btn-outline px-6 py-3 text-[15px]">
            ▶ Watch Demo
          </a>
          {freeVideoLink ? (
            <a
              href={freeVideoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn px-6 py-3 text-[15px] bg-emerald-600 text-white hover:bg-emerald-700"
            >
              🎁 Free Videos
            </a>
          ) : null}
        </div>

        {offer.enabled && offer.endsAt ? (
          <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-800">🔥 {offer.text}</p>
            <CountdownTimer endsAt={offer.endsAt} />
          </div>
        ) : null}

        <div className="mx-auto mt-9 grid max-w-2xl grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="card px-3 py-4">
              <div className="text-lg font-extrabold text-navy sm:text-2xl">
                <AnimatedCounter value={stat.value} />
              </div>
              <div className="mt-0.5 text-[11px] font-medium text-slate-500 sm:text-xs">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
