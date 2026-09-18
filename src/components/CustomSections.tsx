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
  videoThumbnailUrl?: string;
  items: unknown;
};

export default function CustomSections({ sections }: { sections: Section[] }) {
  if (!sections.length) return null;

  return (
    <>
      {sections.map((section) => {
        const items = (Array.isArray(section.items) ? section.items : []) as SectionItem[];
        return (
          <section key={section.id} className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
            <div className="mb-6 text-center">
              <h2 className="section-title mt-0">{section.title}</h2>
              {section.subtitle ? <p className="section-sub">{section.subtitle}</p> : null}
            </div>

            {section.videoUrl ? (
              <ScrollAutoplayVideo videoUrl={section.videoUrl} title={section.title} />
            ) : null}

            {items.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {items.map((item, index) => (
                  <div key={index} className="card card-hover flex flex-col overflow-hidden">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.title || ""}
                        className="h-32 w-full object-cover sm:h-40"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="flex flex-1 flex-col p-4">
                      {item.title ? (
                        <h3 className="text-sm font-bold text-navy sm:text-base">{item.title}</h3>
                      ) : null}
                      {item.description ? (
                        <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-slate-500 sm:text-[13px]">
                          {item.description}
                        </p>
                      ) : null}
                      {item.price ? (
                        <p className="mt-2 text-lg font-extrabold text-navy">{item.price}</p>
                      ) : null}
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary mt-3 w-full py-2 text-xs"
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
