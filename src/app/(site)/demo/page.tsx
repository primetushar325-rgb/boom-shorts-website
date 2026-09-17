import Link from "next/link";
import { getSettings } from "@/lib/settings";

function getYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/,
  );
  return match ? match[1] : null;
}

function getDriveEmbedUrl(url: string): string | null {
  const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  return null;
}

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const s = await getSettings();
  const url = s.demoVideoUrl;
  const youtubeId = url ? getYoutubeId(url) : null;
  const driveEmbed = url && !youtubeId ? getDriveEmbedUrl(url) : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-5 py-16 text-white">
      <div className="w-full max-w-3xl rounded-3xl border border-amber-400/20 bg-white/[0.04] p-8 text-center backdrop-blur">
        <span className="inline-block rounded-full bg-blue-600 px-4 py-1 text-xs font-bold uppercase tracking-wide">
          ▶ Demo
        </span>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">See Our Work In Action</h1>
        <p className="mt-2 text-sm text-slate-400">A sample of what {s.siteName} delivers.</p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-amber-400/20">
          {youtubeId ? (
            <div className="aspect-video">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                title="Demo Video"
                allow="accelerate; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : driveEmbed ? (
            <div className="aspect-video">
              <iframe className="h-full w-full" src={driveEmbed} title="Demo Video" allow="autoplay" allowFullScreen />
            </div>
          ) : url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex aspect-video items-center justify-center bg-gradient-to-br from-amber-500 to-yellow-700 text-lg font-bold"
            >
              ▶ Watch Demo Video
            </a>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-slate-900 text-sm text-slate-500">
              No demo video has been added yet. Please check back soon.
            </div>
          )}
        </div>

        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-gradient-to-r from-amber-400 to-yellow-600 px-6 py-3 text-sm font-bold text-white"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
