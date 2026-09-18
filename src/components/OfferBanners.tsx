export type BannerItem = {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  link: string;
  buttonText: string;
  buttonUrl: string;
  type: string;
};

export default function OfferBanners({ banners }: { banners: BannerItem[] }) {
  if (!banners.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {banners.map((banner) => {
          const target = banner.buttonUrl || banner.link;
          const inner = (
            <div className="card card-hover relative flex h-full flex-col overflow-hidden">
              {banner.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={banner.imageUrl}
                  alt={banner.title || "Offer banner"}
                  className="h-36 w-full object-cover sm:h-44"
                  loading="lazy"
                />
              ) : null}
              <div className={`flex flex-1 flex-col p-4 ${banner.imageUrl ? "" : "bg-gradient-to-br from-blue-600 to-navy"}`}>
                {banner.type === "offer" ? (
                  <span className="badge mb-2 w-fit bg-red-600 text-white">OFFER</span>
                ) : null}
                {banner.title ? (
                  <p className={`text-sm font-extrabold ${banner.imageUrl ? "text-navy" : "text-white"}`}>
                    {banner.title}
                  </p>
                ) : null}
                {banner.description ? (
                  <p className={`mt-1 text-xs leading-relaxed ${banner.imageUrl ? "text-slate-500" : "text-blue-100"}`}>
                    {banner.description}
                  </p>
                ) : null}
                {target && banner.buttonText ? (
                  <span className={`btn mt-3 w-fit px-4 py-2 text-xs ${banner.imageUrl ? "btn-primary" : "bg-white text-navy hover:bg-blue-50"}`}>
                    {banner.buttonText}
                  </span>
                ) : null}
              </div>
            </div>
          );

          return target ? (
            <a key={banner.id} href={target} target="_blank" rel="noopener noreferrer" className="block h-full">
              {inner}
            </a>
          ) : (
            <div key={banner.id} className="h-full">
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
