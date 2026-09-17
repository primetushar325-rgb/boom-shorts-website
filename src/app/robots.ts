import type { MetadataRoute } from "next";

/**
 * The admin app must never be crawled or linked to from search results. The
 * admin layout also sets `robots: noindex` in its metadata; this is the
 * belt-and-braces rule at the crawler level.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://boomshorts.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${base.replace(/\/+$/, "")}/sitemap.xml`,
  };
}
