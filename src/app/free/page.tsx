import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { db } from "@/db";
import { freeVideoCards } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function FreeVideoPage() {
  const s = await getSettings();
  const cards = await db
    .select()
    .from(freeVideoCards)
    .where(eq(freeVideoCards.visible, true))
    .orderBy(asc(freeVideoCards.sortOrder), asc(freeVideoCards.id));

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-16 text-white">
      <div className="mx-auto max-w-5xl text-center">
        <span className="inline-block rounded-full bg-emerald-500 px-4 py-1 text-xs font-bold uppercase tracking-wide">
          🎁 Free Gift
        </span>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Enjoy These Free Videos!</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
          Special free resources from {s.siteName}. Message us on WhatsApp if you have any questions.
        </p>

        {cards.length > 0 ? (
          <div className="mt-10 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <a
                key={card.id}
                href={card.link || "#"}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col overflow-hidden rounded-2xl border border-amber-400/20 bg-white/[0.04] backdrop-blur transition hover:-translate-y-1 hover:border-amber-400/50"
              >
                <div className="aspect-video w-full overflow-hidden bg-slate-900">
                  {card.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.thumbnailUrl}
                      alt={card.title}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-amber-500 to-yellow-700 text-3xl">
                      ▶
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-white">{card.title}</h3>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-10 flex aspect-video items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-sm text-slate-500">
            No free videos have been added yet. Please check back soon.
          </div>
        )}

        <Link
          href="/"
          className="mt-10 inline-block rounded-full bg-gradient-to-r from-amber-400 to-yellow-600 px-6 py-3 text-sm font-bold text-white"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
