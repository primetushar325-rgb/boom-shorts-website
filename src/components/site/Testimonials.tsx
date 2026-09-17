export default function Testimonials({
  items,
}: {
  items: { id: number; name: string; avatarUrl: string; message: string; rating: number }[];
}) {
  if (!items.length) return null;

  return (
    <section id="reviews" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-bs-primary">Reviews</p>
        <h2 className="mt-1 text-2xl font-extrabold text-bs-ink sm:text-3xl">
          What Our Clients Say
        </h2>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <figure
            key={t.id}
            className="flex h-full flex-col rounded-2xl border border-bs-line bg-white p-5 shadow-bs-card"
          >
            <div className="flex items-center gap-1 text-bs-gold" aria-label={`${t.rating} out of 5`}>
              {"★".repeat(Math.max(0, Math.min(5, t.rating)))}
              <span className="text-bs-line">{"★".repeat(Math.max(0, 5 - t.rating))}</span>
            </div>
            <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
              “{t.message}”
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-2 border-t border-bs-line pt-3">
              {t.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" loading="lazy" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-bs-primary-soft text-xs font-bold text-bs-primary">
                  {t.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="text-xs font-bold text-bs-ink">{t.name}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
