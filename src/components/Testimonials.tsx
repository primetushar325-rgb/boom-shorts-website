type Testimonial = {
  id: number;
  name: string;
  avatarUrl: string;
  message: string;
  rating: number;
};

export default function Testimonials({ items }: { items: Testimonial[] }) {
  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 py-16">
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Testimonials</p>
        <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">What Our Clients Say</h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition hover:-translate-y-1 hover:border-amber-300/30"
          >
            <div className="mb-3 text-amber-400">{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</div>
            <p className="text-sm leading-relaxed text-slate-300">&ldquo;{t.message}&rdquo;</p>
            <div className="mt-5 flex items-center gap-3">
              {t.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.avatarUrl} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-500 text-sm font-bold text-white">
                  {t.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <p className="text-sm font-semibold text-white">{t.name}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
