import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * Keep customer-facing pages crawlable while excluding private account, payment,
 * checkout, API, admin, and archived static-site paths from crawler fetches.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/checkout", "/orders", "/payment", "/profile", "/website/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
