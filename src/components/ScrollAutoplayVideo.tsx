"use client";

import { useEffect, useRef, useState } from "react";

function getYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/,
  );
  return match ? match[1] : null;
}

/**
 * 16:9 video box. When it scrolls into view it auto-plays (muted, required by
 * browsers for autoplay). When it scrolls out of view (up or down) it pauses.
 * Controlled via the YouTube IFrame postMessage API — no extra script tag needed.
 */
export default function ScrollAutoplayVideo({ videoUrl, title }: { videoUrl: string; title?: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  const videoId = videoUrl ? getYoutubeId(videoUrl) : null;

  useEffect(() => {
    if (!videoId) return;
    const el = wrapperRef.current;
    if (!el) return;

    const postCommand = (func: "playVideo" | "pauseVideo" | "mute") => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args: [] }),
        "*",
      );
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          postCommand("mute");
          postCommand("playVideo");
        } else {
          postCommand("pauseVideo");
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [videoId, ready]);

  if (!videoId) return null;

  return (
    <div
      ref={wrapperRef}
      className="mx-auto mb-10 aspect-video w-full max-w-3xl overflow-hidden rounded-2xl border border-amber-400/20 bg-black shadow-xl shadow-black/40"
    >
      <iframe
        ref={iframeRef}
        onLoad={() => setReady(true)}
        className="h-full w-full"
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1&playsinline=1&controls=1`}
        title={title || "Video"}
        allow="accelerate; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
