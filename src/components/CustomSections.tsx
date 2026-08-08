import ScrollAutoplayVideo from "./ScrollAutoplayVideo";

type SectionItem = {
  title?: string;
  description?: string;
  imageUrl?: string;
  link?: string;
  price?: string;
  buttonText?: string;
};

type Section = {
  id: number;
  title: string;
  subtitle: string;
  videoUrl: string;
  videoThumbnailUrl: string;
  items: unknown;
};

export default function CustomSections({ sections }: { sections: Section[] }) {
  if (!sections.length) return null;

  return (
    <>
      {sections.map((s) => {
        const items = (Array.isArray(s.items) ? s.items : []) as SectionItem[];
        return (
          <section key={s.id} className="mx-auto max-w-7xl px-5 py-14">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">{s.title}</h2>
              {s.subtitle ? <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">{s.subtitle}</p> : null}
            </div>

            {s.videoUrl ? <ScrollAutoplayVideo videoUrl={s.videoUrl} title={s.title} /> : null}

            {items.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur transition hover:-translate-y-1 hover:border-amber-300/30"
                  >
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.title || ""} className="h-40 w-full object-cover" />
                    ) : null}
                    <div className="flex flex-1 flex-col p-5">
                      {item.title ? <h3 className="text-lg font-bold text-white">{item.title}</h3> : null}
                      {item.description ? (
                        <p className="mt-2 flex-1 text-sm text-slate-400">{item.description}</p>
                      ) : null}
                      {item.price ? (
                        <p className="mt-3 text-xl font-extrabold text-amber-300">{item.price}</p>
                      ) : null}
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 rounded-full bg-gradient-to-r from-amber-400 to-yellow-600 px-4 py-2.5 text-center text-sm font-bold text-white"
                        >
                          {item.buttonText || "Learn More"}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </>
  );
}
