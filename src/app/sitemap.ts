import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://boom-shorts-website.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: `${siteUrl}/`, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/reviews`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/demo`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/free`, lastModified, changeFrequency: "weekly", priority: 0.6 },
  ];
}
