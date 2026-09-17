export default function ClientReviewSlider({
  items,
}: {
  items: { id: number; imageUrl: string; caption: string }[];
}) {
  if (!items.length) return null;
  const loop = [...items, ...items];

  return (
    <section className="overflow-hidden py-10">
      <div className="mx-auto mb-6 max-w-6xl px-4 text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-bs-primary">
          ⭐ Client Proof
        </p>
        <h2 className="mt-1 text-2xl font-extrabold text-bs-ink sm:text-3xl">
          Real Results, Real Clients
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-bs-muted">
          Unedited screenshots from our clients&apos; YouTube Studio and WhatsApp.
        </p>
      </div>

      <div className="group relative">
        <div className="animate-bs-marquee flex w-max gap-4 [animation-duration:45s] group-hover:[animation-play-state:paused]">
          {loop.map((item, idx) => (
            <figure
              key={`${item.id}-${idx}`}
              className="w-44 shrink-0 overflow-hidden rounded-2xl border border-bs-line bg-white shadow-bs-card sm:w-56"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.caption || "Client review proof"}
                loading="lazy"
                className="h-72 w-full object-cover sm:h-80"
              />
              {item.caption ? (
                <figcaption className="px-3 py-2 text-center text-[11px] text-bs-muted">
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
