import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { freeVideoCards } from "@/db/schema";
import SitePageHeader from "@/components/SitePageHeader";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free Videos",
  description: "Free video resources from Boom Shorts — bonus content for our customers.",
  alternates: { canonical: "/free" },
};

export default async function FreeVideoPage() {
  await ensureSchema();
  const settings = await getSettings();

  const cards = await db
    .select()
    .from(freeVideoCards)
    .where(eq(freeVideoCards.visible, true))
    .orderBy(asc(freeVideoCards.sortOrder), asc(freeVideoCards.id));

  return (
    <main className="min-h-screen">
      <SitePageHeader
        title="Free Videos"
        subtitle={`Free resources from ${settings.siteName}. Tap a card to open it.`}
      />

      <div className="mx-auto max-w-5xl px-4 py-6">
        {cards.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {cards.map((card) => (
              <a
                key={card.id}
                href={card.link || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="card card-hover flex flex-col overflow-hidden"
              >
                <div className="aspect-video w-full overflow-hidden bg-white/5">
                  {card.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.thumbnailUrl}
                      alt={card.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-charcoal to-ink text-2xl text-white">
                      ▶
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h2 className="line-clamp-2 text-[13px] font-bold text-warm">{card.title}</h2>
                  <span className="mt-2 inline-block text-[11px] font-semibold text-gold">
                    Watch free →
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="card grid aspect-video place-items-center text-sm text-muted-2">
            No free videos have been added yet. Please check back soon.
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/#boom-shorts" className="btn-primary px-5 py-2.5 text-xs">
            Browse paid packages
          </Link>
        </div>
      </div>
    </main>
  );
}
