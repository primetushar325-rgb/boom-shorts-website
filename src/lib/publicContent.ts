import { unstable_cache } from "next/cache";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import {
  banners,
  faqs,
  freeVideoCards,
  gallery,
  notices,
  packages,
  proofSlides,
  sections,
  testimonials,
} from "@/db/schema";
import { ensureProofSlideSeed } from "@/lib/proofSeed";
import { getSettings, publicSettings } from "@/lib/settings";

/**
 * Cached read layer for *public* content only.
 *
 * Everything here is content an anonymous visitor can already see, so it is
 * safe to cache. Orders, payments, customer data, admin data and any
 * authenticated request are never cached and stay fully dynamic.
 *
 * Each query is tagged; admin writes call `revalidatePublicContent(tag)` so a
 * content change shows up on the public site immediately.
 */

export const PUBLIC_TAGS = {
  settings: "public:settings",
  packages: "public:packages",
  sections: "public:sections",
  banners: "public:banners",
  notices: "public:notices",
  testimonials: "public:testimonials",
  faqs: "public:faqs",
  gallery: "public:gallery",
  proofSlides: "public:proof-slides",
  freeVideos: "public:free-videos",
} as const;

export type PublicTag = (typeof PUBLIC_TAGS)[keyof typeof PUBLIC_TAGS];

/** Every public tag — used when a broad change (e.g. settings) lands. */
export const ALL_PUBLIC_TAGS: PublicTag[] = Object.values(PUBLIC_TAGS);

const REVALIDATE_SECONDS = 300;

function cached<T>(fn: () => Promise<T>, key: string, tags: string[]) {
  return unstable_cache(fn, [key], { tags, revalidate: REVALIDATE_SECONDS });
}

export const getPublicPackages = cached(
  async () => {
    await ensureSchema();
    return db.select().from(packages).orderBy(asc(packages.sortOrder), asc(packages.id));
  },
  "public-packages",
  [PUBLIC_TAGS.packages],
);

export const getPublicSections = cached(
  async () => {
    await ensureSchema();
    return db
      .select()
      .from(sections)
      .where(eq(sections.visible, true))
      .orderBy(asc(sections.sortOrder));
  },
  "public-sections",
  [PUBLIC_TAGS.sections],
);

export const getPublicBanners = cached(
  async () => {
    await ensureSchema();
    return db
      .select()
      .from(banners)
      .where(eq(banners.visible, true))
      .orderBy(asc(banners.sortOrder));
  },
  "public-banners",
  [PUBLIC_TAGS.banners],
);

export const getPublicNotices = cached(
  async () => {
    await ensureSchema();
    return db
      .select()
      .from(notices)
      .where(eq(notices.visible, true))
      .orderBy(asc(notices.sortOrder));
  },
  "public-notices",
  [PUBLIC_TAGS.notices],
);

export const getPublicTestimonials = cached(
  async () => {
    await ensureSchema();
    return db
      .select()
      .from(testimonials)
      .where(eq(testimonials.visible, true))
      .orderBy(asc(testimonials.sortOrder));
  },
  "public-testimonials",
  [PUBLIC_TAGS.testimonials],
);

export const getPublicFaqs = cached(
  async () => {
    await ensureSchema();
    return db.select().from(faqs).where(eq(faqs.visible, true)).orderBy(asc(faqs.sortOrder));
  },
  "public-faqs",
  [PUBLIC_TAGS.faqs],
);

export const getPublicGallery = cached(
  async () => {
    await ensureSchema();
    return db.select().from(gallery).where(eq(gallery.visible, true)).orderBy(asc(gallery.sortOrder));
  },
  "public-gallery",
  [PUBLIC_TAGS.gallery],
);

export const getPublicProofSlides = cached(
  async () => {
    await ensureSchema();
    // keeps the starter client-proof screenshots from the original site
    await ensureProofSlideSeed();
    return db
      .select()
      .from(proofSlides)
      .where(eq(proofSlides.visible, true))
      .orderBy(asc(proofSlides.sortOrder));
  },
  "public-proof-slides",
  [PUBLIC_TAGS.proofSlides],
);

/**
 * Public-safe settings (the admin password hash and visitor counter are
 * stripped). The site shell and every public page need these on each request,
 * and they are exactly the kind of anonymous-visitor data that is safe to cache;
 * an admin save revalidates `public:settings` so a change still appears at once.
 *
 * Anything authenticated (admin auth, customer sessions, orders) keeps using the
 * uncached `getSettings()` / direct queries.
 */
export const getPublicSettings = cached(
  async () => {
    const settings = await getSettings();
    return publicSettings(settings);
  },
  "public-settings",
  [PUBLIC_TAGS.settings],
);

export type PublicSettings = Awaited<ReturnType<typeof getPublicSettings>>;

export const getPublicFreeVideoFlag = cached(
  async () => {
    await ensureSchema();
    const rows = await db
      .select({ id: freeVideoCards.id })
      .from(freeVideoCards)
      .orderBy(desc(freeVideoCards.sortOrder))
      .limit(1);
    return rows.length > 0;
  },
  "public-free-videos",
  [PUBLIC_TAGS.freeVideos],
);
