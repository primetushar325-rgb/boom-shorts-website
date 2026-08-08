import AnimatedCounter from "./AnimatedCounter";
import CountdownTimer from "./CountdownTimer";

export default function Hero({
  badgeText,
  title,
  subtitle,
  stats,
  offer,
}: {
  badgeText: string;
  title: string;
  subtitle: string;
  stats: { label: string; value: string }[];
  offer: { enabled: boolean; text: string; endsAt: string | null };
}) {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-slate-950 pb-16 pt-16 sm:pt-24"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-amber-500/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[360px] w-[360px] rounded-full bg-yellow-600/30 blur-[110px]" />
      </div>

      <div className="mx-auto max-w-5xl px-5 text-center">
        <div className="mb-6 flex flex-wrap items-center justify-center gap-4 animate-fade-in">
          <a
            href="/demo"
            className="relative flex w-40 items-center justify-center gap-2 overflow-hidden rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/40 transition hover:scale-105"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            <span className="relative">▶ Demo</span>
          </a>
          <a
            href="https://mihad-free-video.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-40 items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/40 transition hover:scale-105"
          >
            🎁 Free Videos
          </a>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-200 animate-fade-in">
          {badgeText}
        </span>

        <h1 className="mt-6 text-[clamp(2.1rem,5.5vw,3.75rem)] font-extrabold leading-[1.1] text-white animate-fade-in-up">
          {title}
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base text-slate-300 sm:text-lg animate-fade-in-up [animation-delay:120ms]">
          {subtitle}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#boom-shorts"
            className="rounded-full bg-gradient-to-r from-amber-400 to-yellow-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-amber-400/30 transition hover:scale-105 hover:shadow-amber-400/50"
          >
            🚀 View Packages
          </a>
          <a
            href="#services"
            className="rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"
          >
            Explore Services
          </a>
        </div>

        {offer.enabled && offer.endsAt ? (
          <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-sm font-semibold text-amber-300">🔥 {offer.text}</p>
            <CountdownTimer endsAt={offer.endsAt} />
          </div>
        ) : null}

        <div className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-white/5 py-5 backdrop-blur transition hover:-translate-y-1 hover:border-amber-300/30"
            >
              <div className="text-2xl font-extrabold text-white sm:text-3xl">
                <AnimatedCounter value={s.value} />
              </div>
              <div className="mt-1 text-xs text-slate-400 sm:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
