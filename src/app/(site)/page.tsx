import type { Metadata } from "next";
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
import { buildWhatsAppLink, taka } from "@/lib/format";
import { computePackagePricing } from "@/lib/pricing";
import { ensureProofSlideSeed } from "@/lib/proofSeed";
import { getSettings } from "@/lib/settings";

import Header from "@/components/Header";
import NoticeBoard from "@/components/NoticeBoard";
import Hero from "@/components/Hero";
import FeaturedVideo from "@/components/FeaturedVideo";
import OfferBanners from "@/components/OfferBanners";
import PackagesSection from "@/components/PackagesSection";
import CustomSections from "@/components/CustomSections";
import Testimonials from "@/components/Testimonials";
import ClientReviewSlider from "@/components/ClientReviewSlider";
import GallerySection from "@/components/GallerySection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import VisitPing from "@/components/VisitPing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Boom Shorts — Premium YouTube Shorts, Voice Over & SEO Services",
  description:
    "Order high-quality Boom Shorts, voice over videos, thumbnails, SEO and complete YouTube channel management. Pay with bKash or Nagad and track your order online.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  await ensureSchema();
  // keeps the starter client-proof screenshots from the original site
  await ensureProofSlideSeed();
  const settings = await getSettings();

  const [
    allPackages,
    allSections,
    allBanners,
    allNotices,
    allTestimonials,
    allFaqs,
    allGallery,
    allProofSlides,
    allFreeVideos,
  ] = await Promise.all([
    db.select().from(packages).orderBy(asc(packages.sortOrder), asc(packages.id)),
    db.select().from(sections).where(eq(sections.visible, true)).orderBy(asc(sections.sortOrder)),
    db.select().from(banners).where(eq(banners.visible, true)).orderBy(asc(banners.sortOrder)),
    db.select().from(notices).where(eq(notices.visible, true)).orderBy(asc(notices.sortOrder)),
    db
      .select()
      .from(testimonials)
      .where(eq(testimonials.visible, true))
      .orderBy(asc(testimonials.sortOrder)),
    db.select().from(faqs).where(eq(faqs.visible, true)).orderBy(asc(faqs.sortOrder)),
    db.select().from(gallery).where(eq(gallery.visible, true)).orderBy(asc(gallery.sortOrder)),
    db
      .select()
      .from(proofSlides)
      .where(eq(proofSlides.visible, true))
      .orderBy(asc(proofSlides.sortOrder)),
    db
      .select({ id: freeVideoCards.id })
      .from(freeVideoCards)
      .orderBy(desc(freeVideoCards.sortOrder))
      .limit(1),
  ]);

  const visible = allPackages.filter((pkg) => pkg.visible && pkg.showOnHome);
  const boomPackages = visible.filter((pkg) => pkg.category === "boom");
  const servicePackages = visible.filter((pkg) => pkg.category === "service");

  const whatsappLink =
    settings.whatsappLink ||
    buildWhatsAppLink(settings.whatsappNumber, "Hi, I want to order a Boom Shorts package.");

  const freeVideoLink =
    settings.freeVideoLink ||
    (allFreeVideos.length > 0 ? "/free" : "");

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Boom Shorts packages",
    itemListElement: boomPackages.slice(0, 10).map((pkg, index) => {
      const pricing = computePackagePricing(pkg);
      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: pkg.name,
          description: pkg.description || pkg.name,
          category: pkg.category === "boom" ? "Video Editing" : "Digital Service",
          image: settings.logoUrl || undefined,
          offers: {
            "@type": "Offer",
            price: pricing.finalPrice.toFixed(2),
            priceCurrency: "BDT",
            availability: pkg.available
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            url: `/checkout/${pkg.id}`,
          },
        },
      };
    }),
  };

  const businessJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.siteName,
    url: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    logo: settings.logoUrl || undefined,
    contactPoint: settings.whatsappNumber
      ? {
          "@type": "ContactPoint",
          contactType: "customer support",
          telephone: `+${settings.whatsappNumber.replace(/\D/g, "")}`,
          availableLanguage: ["bn", "en"],
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
      />

      <main className="min-h-screen">
        <VisitPing />
        <Header siteName={settings.siteName} logoUrl={settings.logoUrl} whatsappLink={whatsappLink} />
        <NoticeBoard notices={allNotices} />

        <Hero
          badgeText={settings.heroBadgeText}
          title={settings.heroTitle}
          subtitle={settings.heroSubtitle}
          freeVideoLink={freeVideoLink}
          stats={[
            { label: "Happy Clients", value: settings.statHappyClients },
            { label: "Completed Orders", value: settings.statCompletedOrders },
            { label: "SEO Optimized", value: settings.statSeoOptimized },
          ]}
          offer={{
            enabled: settings.offerEnabled,
            text: settings.offerText,
            endsAt: settings.offerEndsAt ? new Date(settings.offerEndsAt).toISOString() : null,
          }}
        />

        <FeaturedVideo
          videoUrl={settings.youtubeVideoUrl}
          thumbnailUrl={settings.youtubeThumbnailUrl}
          title={settings.youtubeTitle}
          description={settings.youtubeDescription}
          channelName={settings.siteName}
          viewsLabel={
            boomPackages.length
              ? `From ${taka(computePackagePricing(boomPackages[0]).finalPrice)}`
              : undefined
          }
        />

        <OfferBanners banners={allBanners} />

        <ClientReviewSlider items={allProofSlides} />

        <PackagesSection
          id="boom-shorts"
          eyebrow="Boom Shorts"
          title="Boom Shorts Packages"
          subtitle="High retention Boom Shorts crafted to go viral — pick the plan that fits your channel."
          packages={boomPackages}
          videoUrl={settings.boomVideoUrl}
        />

        <PackagesSection
          id="services"
          eyebrow="Other Services"
          title="Thumbnail, SEO, Editing & More"
          subtitle="Everything else your channel needs — from scroll-stopping thumbnails to full SEO optimization."
          packages={servicePackages}
          videoUrl={settings.serviceVideoUrl}
        />

        <CustomSections sections={allSections} />

        <div id="reviews">
          <Testimonials items={allTestimonials} />
          <div className="mx-auto -mt-4 mb-4 max-w-6xl px-4 text-center">
            <a href="/reviews" className="btn-outline px-5 py-2.5 text-xs">
              Read all customer reviews →
            </a>
          </div>
        </div>

        <GallerySection items={allGallery} />
        <FAQSection items={allFaqs} />

        <Footer
          siteName={settings.siteName}
          whatsappLink={whatsappLink}
          facebookLink={settings.facebookLink}
          messengerLink={settings.messengerLink}
          telegramLink={settings.telegramLink}
        />
      </main>
    </>
  );
}
