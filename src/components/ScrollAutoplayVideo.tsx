"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseVideoUrl } from "@/lib/youtube";

/**
 * 16:9 video box that plays (muted, as browsers require) while it is on screen
 * and pauses when it scrolls away — driven by the YouTube IFrame postMessage
 * API, so no extra script is loaded.
 *
 * Performance notes:
 *  • The <iframe> is not mounted at all until the box comes within ~600 px of
 *    the viewport. A YouTube embed pulls in roughly a megabyte of player JS per
 *    iframe, and the homepage can contain three of them; mounting them eagerly
 *    was the single heaviest thing happening during the first scroll.
 *  • The poster/thumbnail is rendered in the meantime, with an explicit aspect
 *    ratio, so nothing shifts when the player finally appears.
 *  • One IntersectionObserver drives both mounting and play/pause; there is no
 *    scroll listener.
 */
export default function ScrollAutoplayVideo({
  videoUrl,
  title,
  thumbnailUrl,
}: {
  videoUrl: string;
  title?: string;
  thumbnailUrl?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(false);

  // Memoised: a fresh object on every render used to re-create the observer.
  const info = useMemo(() => parseVideoUrl(videoUrl), [videoUrl]);
  const isYoutube = info?.kind === "youtube";
  const poster = (thumbnailUrl || "").trim() || info?.thumbnailUrl || "";

  useEffect(() => {
    const element = wrapperRef.current;
    if (!info || !element || typeof IntersectionObserver === "undefined") {
      // No observer available: show the player (deferred, never inside the
      // effect body).
      if (info) queueMicrotask(() => setNearViewport(true));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting);
        setInView(visible);
        if (visible) setNearViewport(true); // sticky: never unmount the player
      },
      // Mount a little before it is actually needed.
      { rootMargin: "600px 0px", threshold: 0.01 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [info]);

  // Play / pause through postMessage — only once the player exists.
  useEffect(() => {
    if (!isYoutube || !ready) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const post = (func: "playVideo" | "pauseVideo" | "mute") => {
      win.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
    };
    if (inView) {
      post("mute");
      post("playVideo");
    } else {
      post("pauseVideo");
    }
  }, [isYoutube, ready, inView]);

  if (!info) return null;

  const src = isYoutube
    ? `${info.embedUrl}${info.embedUrl.includes("?") ? "&" : "?"}enablejsapi=1&mute=1&playsinline=1&controls=1`
    : info.embedUrl;

  return (
    <div
      ref={wrapperRef}
      className="relative mx-auto mb-6 aspect-video w-full max-w-3xl overflow-hidden rounded-2xl border border-line bg-black"
    >
      {nearViewport ? (
        <iframe
          ref={iframeRef}
          onLoad={() => setReady(true)}
          className="absolute inset-0 h-full w-full"
          src={src}
          title={title || "Video"}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      ) : poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt={title || "Video thumbnail"}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : null}
    </div>
  );
}
