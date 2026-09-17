export default function GallerySection({
  items,
}: {
  items: { id: number; imageUrl: string; caption: string }[];
}) {
  if (!items.length) return null;

  return (
    <section id="gallery" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-bs-primary">Our Work</p>
        <h2 className="mt-1 text-2xl font-extrabold text-bs-ink sm:text-3xl">Recent Projects</h2>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((g) => (
          <figure
            key={g.id}
            className="group overflow-hidden rounded-2xl border border-bs-line bg-white shadow-bs-card"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={g.imageUrl}
              alt={g.caption || "Project sample"}
              loading="lazy"
              className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
            />
            {g.caption ? (
              <figcaption className="px-3 py-2 text-[11px] font-medium text-bs-muted">
                {g.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}
