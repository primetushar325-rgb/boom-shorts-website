type ProofSlide = { id: number; imageUrl: string; caption: string };

export default function ClientReviewSlider({ items }: { items: ProofSlide[] }) {
  if (!items.length) return null;

  // Duplicate the list so the CSS marquee loops seamlessly.
  const loop = [...items, ...items];

  return (
    <section className="overflow-hidden py-14">
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-300">
          ⭐ Client Review
        </span>
        <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">Real Results, Real Clients</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
          Screenshots straight from our clients&apos; YouTube Studio &amp; WhatsApp — no filters, no edits.
        </p>
      </div>

      <div className="group relative">
        <div className="animate-marquee flex w-max gap-5 [animation-duration:40s] group-hover:[animation-play-state:paused]">
          {loop.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="w-[220px] shrink-0 overflow-hidden rounded-2xl border border-amber-400/20 bg-white/[0.04] shadow-lg shadow-black/40 sm:w-[260px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.caption || "Client review proof"}
                className="h-[380px] w-full object-cover sm:h-[440px]"
              />
              {item.caption ? (
                <p className="p-3 text-center text-xs text-slate-400">{item.caption}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
