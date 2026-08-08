"use client";

import { useState } from "react";

function getYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/,
  );
  return match ? match[1] : null;
}

export default function FeaturedVideo({
  videoUrl,
  thumbnailUrl,
  title,
}: {
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);
  if (!videoUrl) return null;

  const videoId = getYoutubeId(videoUrl);
  const thumb = thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : "");

  return (
    <section className="mx-auto max-w-5xl px-5 py-14">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Featured Video</p>
        <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">{title}</h2>
      </div>

      <div className="group relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/40">
        {playing && videoId ? (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={title}
            allow="accelerate; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="relative block h-full w-full"
            aria-label="Play video"
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt={title} className="h-full w-full object-cover opacity-80 transition group-hover:opacity-95 group-hover:scale-105" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-amber-600 to-yellow-800" />
            )}
            <span className="absolute inset-0 grid place-items-center bg-black/30 transition group-hover:bg-black/40">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-white/90 text-3xl text-amber-500 shadow-2xl transition group-hover:scale-110">
                ▶
              </span>
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
