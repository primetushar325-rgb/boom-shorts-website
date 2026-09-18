type GalleryItem = { id: number; imageUrl: string; caption: string };

export default function GallerySection({ items }: { items: GalleryItem[] }) {
  if (!items.length) return null;

  return (
    <section id="gallery" className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <div className="mb-6 text-center">
        <p className="section-eyebrow">Our Work</p>
        <h2 className="section-title">Portfolio Gallery</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item) => (
          <figure key={item.id} className="group relative overflow-hidden rounded-2xl border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={item.caption || "Gallery"}
              className="h-32 w-full object-cover transition duration-300 group-hover:scale-105 sm:h-44"
              loading="lazy"
            />
            {item.caption ? (
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5 text-[11px] font-semibold text-white">
                {item.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}
