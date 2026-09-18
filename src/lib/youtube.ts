/**
 * Video URL helpers. Everything is optional: an invalid or empty URL simply
 * means "render nothing" instead of breaking the page.
 */

export type VideoInfo = {
  kind: "youtube" | "drive" | "external";
  url: string;
  /** URL to drop into an <iframe src> */
  embedUrl: string;
  /** YouTube id when applicable */
  videoId: string | null;
  /** Fallback poster image (YouTube only) */
  thumbnailUrl: string | null;
};

const YT_PATTERNS = [
  /(?:youtube\.com|youtube-nocookie\.com)\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{6,})/,
  /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
];

export function youtubeId(url: string | null | undefined): string | null {
  const value = (url ?? "").trim();
  if (!value) return null;
  for (const pattern of YT_PATTERNS) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function driveId(url: string): string | null {
  const match =
    url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ??
    url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/) ??
    url.match(/drive\.google\.com\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

/** Parses any supported video link into something embeddable. Returns null if unusable. */
export function parseVideoUrl(url: string | null | undefined): VideoInfo | null {
  const value = (url ?? "").trim();
  if (!value) return null;

  const yt = youtubeId(value);
  if (yt) {
    return {
      kind: "youtube",
      url: value,
      videoId: yt,
      embedUrl: `https://www.youtube.com/embed/${yt}?rel=0&playsinline=1&modestbranding=1`,
      thumbnailUrl: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
    };
  }

  const drive = driveId(value);
  if (drive) {
    return {
      kind: "drive",
      url: value,
      videoId: null,
      embedUrl: `https://drive.google.com/file/d/${drive}/preview`,
      thumbnailUrl: null,
    };
  }

  if (/^https?:\/\//i.test(value)) {
    return { kind: "external", url: value, videoId: null, embedUrl: value, thumbnailUrl: null };
  }

  return null;
}

export function youtubeThumbnail(url: string | null | undefined, custom?: string | null): string | null {
  const custom2 = (custom ?? "").trim();
  if (custom2) return custom2;
  const info = parseVideoUrl(url);
  return info?.thumbnailUrl ?? null;
}
