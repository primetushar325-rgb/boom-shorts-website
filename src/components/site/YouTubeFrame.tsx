"use client";

import { useState } from "react";

/** Client half of YouTubeEmbed: poster first, iframe on tap. */
export default function YouTubeFrame({
  embed,
  poster,
  title,
  className = "",
}: {
  embed: string;
  poster: string | null;
  title: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`bs-video-frame rounded-2xl border border-bs-line bg-slate-900 ${className}`}>
      {loaded ? (
        <iframe
          src={embed}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setLoaded(true)}
          aria-label={`Play video: ${title}`}
          className="absolute inset-0 h-full w-full"
        >
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              width={480}
              height={360}
            />
          ) : null}
          <span className="absolute inset-0 bg-black/25" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-xl text-bs-primary shadow-lg">
              ▶
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
