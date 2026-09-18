import type { Metadata } from "next";
import { Suspense } from "react";
import { buildWhatsAppLink, taka } from "@/lib/format";
import { computePackagePricing } from "@/lib/pricing";
import {
  getPublicBanners,
  getPublicFaqs,
  getPublicFreeVideoFlag,
  getPublicGallery,
  getPublicNotices,
  getPublicPackages,
  getPublicProofSlides,
  getPublicSections,
  getPublicSettings,
  getPublicTestimonials,
} from "@/lib/publicContent";

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
import SectionFallback from "@/components/SectionFallback";

/**
 * Public homepage.
 *
 * Content is read through the cached public-content layer (ISR, 5 min, tagged)
 * so it is not re-queried on every request; admin writes revalidate the tags.
 * Critical content (header, hero, featured video, offers, packages) renders in
 * the first paint; the lower sections stream in behind <Suspense> so they never
 * block it.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Boom Shorts — Premium YouTube Shorts, Voice Over & SEO Services",
  description:
    "Order high-quality Boom Shorts, voice over videos, thumbnails, SEO and complete YouTube channel management. Pay with bKash or Nagad and track your order online.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const settings = await getPublicSettings();

  // Critical, above-the-fold data — fetched in parallel.
  const [allPackages, allNotices, allBanners, hasFreeVideos] = await Promise.all([
    getPublicPackages(),
    getPublicNotices(),
    getPublicBanners(),
    getPublicFreeVideoFlag(),
  ]);

  const visible = allPackages.filter((pkg) => pkg.visible && pkg.showOnHome);
  const boomPackages = visible.filter((pkg) => pkg.category === "boom");
  const servicePackages = visible.filter((pkg) => pkg.category === "service");

  const whatsappLink =
    settings.whatsappLink ||
    buildWhatsAppLink(settings.whatsappNumber, "Hi, I want to order a Boom Shorts package.");

  const freeVideoLink = settings.freeVideoLink || (hasFreeVideos ? "/free" : "");

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

        {/* 1. HEADER / LOGO */}
        <Header siteName={settings.siteName} logoUrl={settings.logoUrl} whatsappLink={whatsappLink} />
        <NoticeBoard notices={allNotices} />

        {/* 2. HERO / MAIN BANNER */}
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

        {/* 3. FEATURED YOUTUBE VIDEO */}
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

        {/* 4. OFFERS / NOTICES / PROMOTIONAL CONTENT */}
        <OfferBanners banners={allBanners} />

        {/* 5. PACKAGES — always before client reviews */}
        <PackagesSection
          id="boom-shorts"
          eyebrow="Boom Shorts"
          title="Boom Shorts Packages"
          subtitle="High retention Boom Shorts crafted to go viral — pick the plan that fits your channel."
          packages={boomPackages}
          videoUrl={settings.boomVideoUrl}
          videoThumbnailUrl={settings.boomVideoThumbnailUrl}
        />

        <PackagesSection
          id="services"
          eyebrow="Other Services"
          title="Thumbnail, SEO, Editing & More"
          subtitle="Everything else your channel needs — from scroll-stopping thumbnails to full SEO optimization."
          packages={servicePackages}
          videoUrl={settings.serviceVideoUrl}
          videoThumbnailUrl={settings.serviceVideoThumbnailUrl}
        />

        {/* 6. OTHER USEFUL SECTIONS — streamed, never blocking the paint above */}
        <Suspense fallback={null}>
          <CustomSectionsBlock />
        </Suspense>

        <Suspense fallback={<SectionFallback title="Portfolio Gallery" />}>
          <GalleryBlock />
        </Suspense>

        <Suspense fallback={<SectionFallback title="Frequently Asked Questions" compact />}>
          <FaqBlock />
        </Suspense>

        {/* 7. CLIENT REVIEWS — lower section, after packages */}
        <Suspense fallback={<SectionFallback title="Real Results, Real Clients" />}>
          <ReviewsBlock />
        </Suspense>

        {/* 8. FOOTER */}
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

async function CustomSectionsBlock() {
  const allSections = await getPublicSections();
  return <CustomSections sections={allSections} />;
}

async function GalleryBlock() {
  const allGallery = await getPublicGallery();
  return <GallerySection items={allGallery} />;
}

async function FaqBlock() {
  const allFaqs = await getPublicFaqs();
  return <FAQSection items={allFaqs} />;
}

async function ReviewsBlock() {
  const [allProofSlides, allTestimonials] = await Promise.all([
    getPublicProofSlides(),
    getPublicTestimonials(),
  ]);

  return (
    <div id="reviews">
      <ClientReviewSlider items={allProofSlides} />
      <Testimonials items={allTestimonials} />
      {allTestimonials.length > 0 ? (
        <div className="mx-auto -mt-2 mb-6 max-w-6xl px-4 text-center">
          <a href="/reviews" className="btn-outline px-5 py-2.5 text-xs">
            Read all customer reviews →
          </a>
        </div>
      ) : null}
    </div>
  );
}
