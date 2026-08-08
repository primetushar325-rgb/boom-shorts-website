import Image from "next/image";

type Banner = {
  id: number;
  title: string;
  imageUrl: string;
  link: string;
  type: string;
};

export default function OfferBanners({ banners }: { banners: Banner[] }) {
  if (!banners.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 py-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {banners.map((b) => {
          const content = (
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/20 to-yellow-600/20">
              {b.imageUrl ? (
                <Image
                  src={b.imageUrl}
                  alt={b.title || "Banner"}
                  width={800}
                  height={280}
                  className="h-40 w-full object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-100 sm:h-48"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-amber-500 to-yellow-700 sm:h-48">
                  <span className="px-4 text-center text-xl font-bold text-white">{b.title}</span>
                </div>
              )}
              {b.imageUrl && b.title ? (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="font-semibold text-white">{b.title}</p>
                </div>
              ) : null}
              {b.type === "offer" ? (
                <span className="absolute right-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow">
                  OFFER
                </span>
              ) : null}
            </div>
          );

          return b.link ? (
            <a key={b.id} href={b.link} target="_blank" rel="noreferrer">
              {content}
            </a>
          ) : (
            <div key={b.id}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}
