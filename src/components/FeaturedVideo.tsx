"use client";

import { useState } from "react";
import { parseVideoUrl } from "@/lib/youtube";

/**
 * YouTube-style featured video block for the top of the homepage.
 * Renders nothing at all when no (valid) video URL is configured.
 */
export default function FeaturedVideo({
  videoUrl,
  thumbnailUrl,
  title,
  description,
  channelName,
  viewsLabel,
}: {
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
  channelName: string;
  viewsLabel?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const info = parseVideoUrl(videoUrl);
  if (!info) return null;

  const thumb = (thumbnailUrl || "").trim() || info.thumbnailUrl || "";
  const embed =
    info.kind === "youtube"
      ? `${info.embedUrl}${info.embedUrl.includes("?") ? "&" : "?"}autoplay=1`
      : info.embedUrl;

  return (
    <section id="featured" className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="card overflow-hidden">
        <div className="relative aspect-video w-full bg-slate-900">
          {playing ? (
            <iframe
              className="h-full w-full"
              src={embed}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="group relative block h-full w-full"
              aria-label={`Play: ${title}`}
            >
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt={title} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-blue-700 to-navy" />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-red-600 text-white shadow-lg transition group-hover:scale-110 sm:h-20 sm:w-20">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                  </svg>
                </span>
              </span>
              <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-0.5 text-[11px] font-bold text-white">
                Featured
              </span>
            </button>
          )}
        </div>

        <div className="flex items-start gap-3 p-4 sm:p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
            {channelName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-[15px] font-bold leading-snug text-navy sm:text-lg">
              {title}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{channelName}</span>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Zm-1 13-3-3 1.4-1.4L11 12.2l3.6-3.6L16 10l-5 5Z" />
                </svg>
                Verified
              </span>
              {viewsLabel ? <span>· {viewsLabel}</span> : null}
            </p>
            {description ? (
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600 sm:text-[13px]">
                {description}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={info.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline px-3.5 py-2 text-xs"
              >
                ▶ Watch on {info.kind === "youtube" ? "YouTube" : "source"}
              </a>
              <a href="#boom-shorts" className="btn-primary px-3.5 py-2 text-xs">
                Order This Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
