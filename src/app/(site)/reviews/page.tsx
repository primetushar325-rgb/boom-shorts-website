import type { Metadata } from "next";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { packages, reviews } from "@/db/schema";
import ReviewsView, { type PublicReview } from "@/components/ReviewsView";
import SitePageHeader from "@/components/SitePageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer Reviews",
  description:
    "Read real customer reviews about Boom Shorts packages, delivery speed and support quality.",
  alternates: { canonical: "/reviews" },
};

export default async function ReviewsPage() {
  await ensureSchema();

  const [rows, packageRows] = await Promise.all([
    db
      .select({
        id: reviews.id,
        name: reviews.name,
        packageName: reviews.packageName,
        rating: reviews.rating,
        message: reviews.message,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(eq(reviews.status, "approved"))
      .orderBy(desc(reviews.createdAt))
      .limit(60),
    db
      .select({ name: packages.name })
      .from(packages)
      .where(and(eq(packages.visible, true)))
      .orderBy(asc(packages.sortOrder))
      .limit(30),
  ]);

  const initialReviews: PublicReview[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    packageName: row.packageName,
    rating: row.rating,
    message: row.message,
    createdAt: new Date(row.createdAt).toISOString(),
  }));

  return (
    <main className="min-h-screen">
      <SitePageHeader
        title="Customer Reviews"
        subtitle="Only genuine reviews from customers — published after our team verifies them."
      />
      <div className="mx-auto max-w-2xl px-4 py-5">
        <ReviewsView
          initialReviews={initialReviews}
          packageNames={packageRows.map((row) => row.name)}
        />
      </div>
    </main>
  );
}
