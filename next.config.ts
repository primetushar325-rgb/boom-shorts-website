import type { NextConfig } from "next";

/**
 * `images.unoptimized: true` used to be set here, which silently disabled the
 * whole point of `next/image`: the header logo is a 1254×1254 / 640 KB PNG
 * rendered at 52 px, and it was being shipped at full size with `priority` on
 * every page — around 640 KB of the first paint on a phone.
 *
 * Optimisation is now on, with remote patterns covering every host a logo can
 * legitimately come from (local /public, the Supabase `site-images` bucket,
 * Vercel Blob and YouTube thumbnails). Anything else is admin content rendered
 * with a plain <img>, which is unaffected by these patterns.
 */
const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // The logo is the only next/image consumer; keep the srcset small so the
    // optimizer does less work and the browser downloads less.
    deviceSizes: [360, 480, 640, 828, 1080],
    imageSizes: [52, 60, 96, 120, 128, 256],
    minimumCacheTTL: 3600,
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default nextConfig;
