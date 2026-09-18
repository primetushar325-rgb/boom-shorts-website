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
    <section
      id="home"
      className="relative overflow-hidden border-b"
      style={{ borderColor: "rgba(212,175,55,0.16)", background: "#050505" }}
    >
      {/* ambient gold wash */}
      <div
        className="animate-gold-pulse pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background:
            "radial-gradient(62% 100% at 50% 0%, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0) 70%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(212,175,55,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.14) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(70% 60% at 50% 0%, #000 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 0%, #000 0%, transparent 75%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-10 text-center sm:pb-16 sm:pt-16">
        {badgeText ? (
          <span
            className="inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gold"
            style={{
              border: "1px solid rgba(212,175,55,0.38)",
              background: "rgba(212,175,55,0.08)",
            }}
          >
            <span className="truncate">{badgeText}</span>
          </span>
        ) : null}

        <h1 className="mt-5 text-[clamp(1.8rem,6vw,3.5rem)] font-extrabold leading-[1.1] tracking-tight text-warm">
          <span className="text-gold-grad">{title}</span>
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          {subtitle}
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a href="#boom-shorts" className="btn-gold btn-shine px-6 py-3 text-[15px]">
            View Packages
          </a>
          <a href="/demo" className="btn-primary btn-shine btn-shine-delay-1 px-6 py-3 text-[15px]">
            ▶ Watch Demo
          </a>
          {freeVideoLink ? (
            <a
              href={freeVideoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline px-6 py-3 text-[15px]"
            >
              🎁 Free Videos
            </a>
          ) : null}
        </div>

        {offer.enabled && offer.endsAt ? (
          <div
            className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3 rounded-2xl p-4"
            style={{
              border: "1px solid rgba(212,175,55,0.4)",
              background:
                "linear-gradient(180deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.02) 100%)",
              boxShadow: "0 0 30px -14px rgba(212,175,55,0.7)",
            }}
          >
            <p className="text-sm font-bold text-gold-light">🔥 {offer.text}</p>
            <CountdownTimer endsAt={offer.endsAt} />
          </div>
        ) : null}

        <div className="mx-auto mt-9 grid max-w-2xl grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="card px-3 py-4">
              <div className="text-lg font-extrabold text-gold sm:text-2xl">
                <AnimatedCounter value={stat.value} />
              </div>
              <div className="mt-0.5 text-[11px] font-medium text-muted sm:text-xs">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
