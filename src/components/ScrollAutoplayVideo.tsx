"use client";

import { useEffect, useRef, useState } from "react";
import { parseVideoUrl } from "@/lib/youtube";

/**
 * 16:9 video box. When it scrolls into view it auto-plays (muted, required by
 * browsers for autoplay) and pauses when it scrolls away — controlled through
 * the YouTube IFrame postMessage API, no extra script needed.
 */
export default function ScrollAutoplayVideo({
  videoUrl,
  title,
}: {
  videoUrl: string;
  title?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  const info = parseVideoUrl(videoUrl);
  const isYoutube = info?.kind === "youtube";

  useEffect(() => {
    if (!info || !isYoutube) return;
    const element = wrapperRef.current;
    if (!element) return;

    const post = (func: "playVideo" | "pauseVideo" | "mute") => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args: [] }),
        "*",
      );
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          post("mute");
          post("playVideo");
        } else {
          post("pauseVideo");
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [info, isYoutube, ready]);

  if (!info) return null;

  const src = isYoutube
    ? `${info.embedUrl}${info.embedUrl.includes("?") ? "&" : "?"}enablejsapi=1&mute=1&playsinline=1&controls=1`
    : info.embedUrl;

  return (
    <div
      ref={wrapperRef}
      className="mx-auto mb-6 aspect-video w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm"
    >
      <iframe
        ref={iframeRef}
        onLoad={() => setReady(true)}
        className="h-full w-full"
        src={src}
        title={title || "Video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
