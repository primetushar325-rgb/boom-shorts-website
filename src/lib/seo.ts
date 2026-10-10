import type { Metadata } from "next";

/**
 * The public, indexable site has one canonical origin. Keep it independent from
 * Vercel preview URLs so previews never leak into canonical tags, JSON-LD,
 * robots.txt, or the sitemap.
 */
const FALLBACK_SITE_URL = "https://boom-shorts-website.vercel.app";

export const SITE_NAME = "Mihad Boom";
export const SITE_ALTERNATE_NAME = "Mihad Boom Shorts";
export const SITE_DESCRIPTION =
  "Mihad Boom creates premium YouTube Shorts, voice-over videos, thumbnails, and YouTube SEO services for creators and brands.";

function normalizeSiteUrl(value?: string): string {
  if (!value) return FALLBACK_SITE_URL;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return FALLBACK_SITE_URL;

    // The application is served at the origin. Dropping paths, queries, hashes,
    // and credentials prevents accidental non-canonical URLs in search metadata.
    return url.origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export function absoluteUrl(path = "/"): string {
  const pathname = path.startsWith("/") ? path : `/${path}`;
  return new URL(pathname, `${siteUrl}/`).toString();
}

export const socialImage = {
  url: absoluteUrl("/og-image.png"),
  width: 1200,
  height: 630,
  alt: "Mihad Boom — Premium YouTube Shorts, Voice Over & SEO Services",
  type: "image/png",
} as const;

type PublicPageMetadataOptions = {
  /** The human-readable page name, without the brand suffix. */
  title: string;
  description: string;
  /** Site-relative, canonical route path. */
  path: string;
  /** Use for the homepage when the visible title must not use the root template. */
  absoluteTitle?: boolean;
};

/**
 * Gives every indexable public page a matching title, description, canonical,
 * Open Graph URL, and Twitter card. Private flows deliberately do not call this
 * helper: they are marked noindex instead of publishing a misleading canonical.
 */
export function publicPageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: PublicPageMetadataOptions): Metadata {
  const canonical = absoluteUrl(path);
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      locale: "en_BD",
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [socialImage],
    },
  };
}

/**
 * Returns a safe absolute HTTP(S) URL for public structured data. Relative
 * paths stay on this site, while common bare social URLs such as `t.me/name`
 * are normalized to HTTPS instead of being mistaken for local paths.
 */
export function publicHttpUrl(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const normalizedValue = trimmed.startsWith("//")
    ? `https:${trimmed}`
    : /^[a-z][a-z\d+.-]*:/i.test(trimmed)
      ? trimmed
      : /^[a-z\d-]+(?:\.[a-z\d-]+)+(?:[/:?#]|$)/i.test(trimmed)
        ? `https://${trimmed}`
        : trimmed;

  try {
    const url = new URL(normalizedValue, `${siteUrl}/`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * JSON-LD lives in a script element. Escape HTML-significant characters so a
 * database-managed title, description, or profile link cannot terminate it.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
