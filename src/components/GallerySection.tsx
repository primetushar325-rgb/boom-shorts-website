type GalleryItem = { id: number; imageUrl: string; caption: string };

export default function GallerySection({ items }: { items: GalleryItem[] }) {
  if (!items.length) return null;

  return (
    <section id="gallery" className="mx-auto max-w-7xl px-5 py-16">
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Our Work</p>
        <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">Portfolio Gallery</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((g) => (
          <div key={g.id} className="group relative overflow-hidden rounded-2xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={g.imageUrl}
              alt={g.caption || "Gallery"}
              className="h-44 w-full object-cover transition duration-300 group-hover:scale-110"
            />
            {g.caption ? (
              <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/85 to-transparent p-3 transition group-hover:translate-y-0">
                <p className="text-xs font-semibold text-white">{g.caption}</p>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
