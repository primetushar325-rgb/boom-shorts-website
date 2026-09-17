import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { packages } from "@/db/schema";

/**
 * Static customer pages plus one entry per visible package's checkout page.
 *
 * The database read is wrapped so a database outage degrades to the static
 * routes instead of failing the whole sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://boomshorts.com").replace(/\/+$/, "");
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/reviews`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/orders`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/demo`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/free`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const visible = await db
    .select({ id: packages.id })
    .from(packages)
    .where(eq(packages.visible, true))
    .catch(() => [] as { id: number }[]);

  return [
    ...staticRoutes,
    ...visible.map((p) => ({
      url: `${base}/checkout/${p.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      lastModified: now,
    })),
  ];
}
