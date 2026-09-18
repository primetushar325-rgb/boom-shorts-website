type ProofSlide = { id: number; imageUrl: string; caption: string };

export default function ClientReviewSlider({ items }: { items: ProofSlide[] }) {
  if (!items.length) return null;

  const loop = [...items, ...items];

  return (
    <section className="overflow-hidden py-10 sm:py-14">
      <div className="mb-6 px-4 text-center">
        <span className="badge bg-amber-100 text-amber-800">★ Client Reviews</span>
        <h2 className="section-title">Real Results, Real Clients</h2>
        <p className="section-sub">
          Screenshots straight from our clients&apos; YouTube Studio &amp; WhatsApp — no filters,
          no edits.
        </p>
      </div>

      <div className="group relative">
        <div className="animate-marquee flex w-max gap-3 px-4 [animation-duration:45s] group-hover:[animation-play-state:paused] sm:gap-4">
          {loop.map((item, index) => (
            <figure
              key={`${item.id}-${index}`}
              className="w-[150px] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:w-[210px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.caption || "Client review proof"}
                className="h-[240px] w-full object-cover sm:h-[340px]"
                loading="lazy"
              />
              {item.caption ? (
                <figcaption className="p-2 text-center text-[11px] text-slate-500">
                  {item.caption}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
