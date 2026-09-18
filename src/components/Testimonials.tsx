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
    <section id="testimonials" className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-6 text-center">
        <p className="section-eyebrow">Testimonials</p>
        <h2 className="section-title">What Our Clients Say</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <figure key={item.id} className="card p-4 sm:p-5">
            <div className="text-gold" aria-label={`${item.rating} out of 5`}>
              {"★".repeat(Math.max(0, Math.min(5, item.rating)))}
              <span className="text-muted-2">
                {"★".repeat(Math.max(0, 5 - Math.min(5, item.rating)))}
              </span>
            </div>
            <blockquote className="mt-2.5 text-[13px] leading-relaxed text-warm-dim">
              &ldquo;{item.message}&rdquo;
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-2.5">
              {item.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.avatarUrl}
                  alt={item.name}
                  className="h-9 w-9 rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gold-soft text-xs font-bold text-gold-light">
                  {item.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="text-[13px] font-bold text-warm">{item.name}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
