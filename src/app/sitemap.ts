import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * Only list public, canonical landing pages. Account, admin, payment, and
 * checkout routes are intentionally noindex and therefore excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/reviews"), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/demo"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/free"), changeFrequency: "weekly", priority: 0.6 },
  ];
}
