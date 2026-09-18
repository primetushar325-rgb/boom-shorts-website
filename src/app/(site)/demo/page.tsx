import type { Metadata } from "next";
import SitePageHeader from "@/components/SitePageHeader";
import { getSettings } from "@/lib/settings";
import { parseVideoUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demo Video",
  description: "See a sample of the Boom Shorts video quality before you order.",
  alternates: { canonical: "/demo" },
};

export default async function DemoPage() {
  const settings = await getSettings();
  const video = parseVideoUrl(settings.demoVideoUrl);

  return (
    <main className="min-h-screen">
      <SitePageHeader title="See Our Work In Action" subtitle={`A sample of what ${settings.siteName} delivers.`} />

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="card overflow-hidden">
          {video ? (
            <div className="aspect-video w-full bg-black">
              <iframe
                className="h-full w-full"
                src={video.embedUrl}
                title="Demo video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="grid aspect-video place-items-center bg-slate-100 text-sm text-slate-400">
              No demo video has been added yet. Please check back soon.
            </div>
          )}
        </div>

        {video ? (
          <div className="mt-4 text-center">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline px-5 py-2.5 text-xs"
            >
              Open in a new tab
            </a>
          </div>
        ) : null}
      </div>
    </main>
  );
}
