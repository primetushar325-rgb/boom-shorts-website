import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { testimonials } from "@/db/schema";
import BottomNav from "@/components/site/BottomNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Customer Reviews",
  description: "Verified reviews from Boom Shorts customers.",
};

/** Star row, clamped so a bad row can never render 40 stars. */
function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-1 text-bs-gold" aria-label={`${r} out of 5`}>
      {"★".repeat(r)}
      <span className="text-bs-line">{"★".repeat(5 - r)}</span>
    </div>
  );
}

export default async function ReviewsPage() {
  // Same approval gate as the homepage: approved AND visible, never both.
  const rows = await db
    .select()
    .from(testimonials)
    .where(and(eq(testimonials.approved, true), eq(testimonials.visible, true)))
    .orderBy(asc(testimonials.sortOrder), desc(testimonials.id))
    .limit(200);

  const count = rows.length;
  const average = count
    ? rows.reduce((sum, r) => sum + Math.max(0, Math.min(5, r.rating)), 0) / count
    : 0;

  return (
    <main className="min-h-screen bg-bs-bg pb-24 md:pb-12">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-bs-primary">Reviews</p>
        <h1 className="mt-1 text-xl font-extrabold text-bs-ink sm:text-2xl">
          What Our Clients Say
        </h1>

        {count > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-bs-line bg-white p-4 shadow-bs-card">
            <div>
              <p className="text-2xl font-extrabold text-bs-ink">{average.toFixed(1)}</p>
              <p className="text-[11px] font-semibold text-bs-muted">Average rating</p>
            </div>
            <div className="h-8 w-px bg-bs-line" />
            <div>
              <p className="text-2xl font-extrabold text-bs-ink">{count}</p>
              <p className="text-[11px] font-semibold text-bs-muted">Approved reviews</p>
            </div>
            <div className="ml-auto">
              <Stars rating={Math.round(average)} />
            </div>
          </div>
        ) : null}

        {count === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-bs-line bg-white px-6 py-14 text-center">
            <p className="text-3xl">⭐</p>
            <p className="mt-2 text-sm font-bold text-bs-ink">No reviews yet</p>
            <p className="mt-1 text-xs text-bs-muted">
              Approved customer reviews will appear here.
            </p>
            <Link
              href="/#packages"
              className="mt-4 inline-block rounded-xl bg-bs-primary px-5 py-2.5 text-sm font-bold text-white"
            >
              Browse Packages
            </Link>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {rows.map((t) => (
              <li key={t.id}>
                <figure className="flex h-full flex-col rounded-2xl border border-bs-line bg-white p-5 shadow-bs-card">
                  <Stars rating={t.rating} />
                  <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                    “{t.message}”
                  </blockquote>
                  <figcaption className="mt-4 flex items-center gap-2 border-t border-bs-line pt-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bs-primary-soft text-xs font-extrabold text-bs-primary">
                      {t.name.trim().charAt(0).toUpperCase() || "🙂"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-bs-ink">{t.name}</span>
                      <span className="block text-[10px] text-bs-muted">
                        {new Date(t.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
