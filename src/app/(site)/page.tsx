import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { banners, faqs, gallery, notices, proofSlides, testimonials } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { getHomepagePackages, toCardData } from "@/lib/packages";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { ensureProofSlideSeed } from "@/lib/proofSeed";

import Header from "@/components/site/Header";
import NoticeBoard from "@/components/site/NoticeBoard";
import Hero from "@/components/site/Hero";
import OfferBanners from "@/components/site/OfferBanners";
import PackageCard from "@/components/site/PackageCard";
import ClientReviewSlider from "@/components/site/ClientReviewSlider";
import GallerySection from "@/components/site/GallerySection";
import Testimonials from "@/components/site/Testimonials";
import FAQSection from "@/components/site/FAQSection";
import Footer from "@/components/site/Footer";
import BottomNav from "@/components/site/BottomNav";
import VisitPing from "@/components/site/VisitPing";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const s = await getSettings();
  await ensureProofSlideSeed();

  // One batched round-trip for the content tables; packages load separately so
  // their features can be attached with a single grouped query.
  const [allBanners, allNotices, allTestimonials, allFaqs, allGallery, allProof, boomPkgs] =
    await Promise.all([
      db.select().from(banners).where(eq(banners.visible, true)).orderBy(asc(banners.sortOrder)),
      db.select().from(notices).where(eq(notices.visible, true)).orderBy(asc(notices.sortOrder)),
      db
        .select()
        .from(testimonials)
        .where(eq(testimonials.visible, true))
        .orderBy(asc(testimonials.sortOrder)),
      db.select().from(faqs).where(eq(faqs.visible, true)).orderBy(asc(faqs.sortOrder)),
      db.select().from(gallery).where(eq(gallery.visible, true)).orderBy(asc(gallery.sortOrder)),
      db.select().from(proofSlides).where(eq(proofSlides.visible, true)).orderBy(asc(proofSlides.sortOrder)),
      getHomepagePackages(),
    ]);

  // Reviews are admin-gated: only approved rows reach the public site.
  const approvedReviews = allTestimonials.filter((t) => t.approved);

  const whatsappLink =
    s.whatsappLink || buildWhatsAppLink(s.whatsappNumber, `Hi, I want to order from ${s.siteName}.`);

  return (
    <div className="flex min-h-screen flex-col bg-bs-bg">
      <VisitPing />
      <Header siteName={s.siteName} logoUrl={s.logoUrl} />
      <NoticeBoard notices={allNotices} />

      <main className="flex-1 pb-20 md:pb-0">
        <Hero
          badgeText={s.heroBadgeText}
          title={s.heroTitle}
          subtitle={s.heroSubtitle}
          stats={[
            { label: "Happy Clients", value: s.statHappyClients },
            { label: "Completed Orders", value: s.statCompletedOrders },
            { label: "SEO Optimized", value: s.statSeoOptimized },
          ]}
        />

        <OfferBanners banners={allBanners} />

        {/* ---- Package grid: 2 columns on mobile, 3–4 on larger screens ---- */}
        <section id="packages" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-bs-primary">
              Packages
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-bs-ink sm:text-3xl">
              Choose Your Package
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-bs-muted">
              Ready-to-upload shorts, voice overs and channel SEO. Prices include delivery.
            </p>
          </div>

          {boomPkgs.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {boomPkgs.map((p) => (
                <PackageCard key={p.id} pkg={toCardData(p)} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-bs-line bg-white px-6 py-14 text-center">
              <p className="text-sm font-bold text-bs-ink">No packages available yet</p>
              <p className="mt-1 text-xs text-bs-muted">
                Please check back soon, or message us on WhatsApp for custom pricing.
              </p>
            </div>
          )}
        </section>

        <ClientReviewSlider items={allProof} />
        <Testimonials items={approvedReviews} />
        <GallerySection items={allGallery} />
        <FAQSection items={allFaqs} />
      </main>

      <Footer
        siteName={s.siteName}
        whatsappLink={whatsappLink}
        facebookLink={s.facebookLink}
        messengerLink={s.messengerLink}
        telegramLink={s.telegramLink}
        freeVideoLink={s.freeVideoLink}
      />

      <BottomNav />
    </div>
  );
}
