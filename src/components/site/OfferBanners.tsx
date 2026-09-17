export default function OfferBanners({
  banners,
}: {
  banners: { id: number; title: string; subtitle: string; imageUrl: string; buttonText: string; buttonLink: string; link: string }[];
}) {
  if (!banners.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {banners.map((b) => {
          const href = b.buttonLink || b.link;
          const body = (
            <div className="relative flex min-h-28 items-center gap-4 overflow-hidden rounded-2xl border border-bs-line bg-white p-4 shadow-bs-card transition hover:shadow-bs-lift">
              {b.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                />
              ) : null}
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-bs-ink">{b.title}</h3>
                {b.subtitle ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-bs-muted">{b.subtitle}</p>
                ) : null}
                {b.buttonText ? (
                  <span className="mt-2 inline-block rounded-lg bg-bs-primary px-3 py-1 text-[11px] font-bold text-white">
                    {b.buttonText}
                  </span>
                ) : null}
              </div>
            </div>
          );
          return href ? (
            <a key={b.id} href={href} target="_blank" rel="noopener noreferrer">
              {body}
            </a>
          ) : (
            <div key={b.id}>{body}</div>
          );
        })}
      </div>
    </section>
  );
}
