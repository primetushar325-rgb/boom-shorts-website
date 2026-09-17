/**
 * YouTube URL handling.
 *
 * Admins paste whatever the browser gave them, so accept every common shape:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtube.com/watch?v=VIDEO_ID&list=...&t=42s
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 *   https://www.youtube.com/shorts/VIDEO_ID
 *   https://www.youtube.com/live/VIDEO_ID
 *   https://m.youtube.com/watch?v=VIDEO_ID
 *   VIDEO_ID            (a bare 11-char id is also accepted)
 *
 * Video ids are exactly 11 characters from [A-Za-z0-9_-].
 */

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const URL_PATTERNS: RegExp[] = [
  /(?:youtube\.com|youtube-nocookie\.com)\/(?:watch\?(?:[^#]*&)?v=)([A-Za-z0-9_-]{11})/i,
  /(?:youtube\.com|youtube-nocookie\.com)\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/i,
  /youtu\.be\/([A-Za-z0-9_-]{11})/i,
];

/** Extracts an 11-char video id, or null when the input is not a YouTube link. */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const value = url.trim();
  if (!value) return null;

  if (ID_PATTERN.test(value)) return value;

  for (const pattern of URL_PATTERNS) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function isYouTubeUrl(url: string | null | undefined): boolean {
  return extractYouTubeId(url) !== null;
}

/**
 * Responsive 16:9 embed URL.
 * `lite` uses the cookie-free nocookie host and defers autoplay.
 */
export function youtubeEmbedUrl(
  url: string | null | undefined,
  opts: { autoplay?: boolean; start?: number } = {},
): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;

  const params = new URLSearchParams();
  params.set("rel", "0");
  params.set("modestbranding", "1");
  params.set("playsinline", "1");
  if (opts.autoplay) {
    params.set("autoplay", "1");
    params.set("mute", "1");
  }
  if (opts.start) params.set("start", String(Math.max(0, Math.floor(opts.start))));

  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

/** Thumbnail for card/poster use — `hq` (480x360) is the safest default. */
export function youtubeThumbnailUrl(
  url: string | null | undefined,
  quality: "default" | "mq" | "hq" | "sd" | "max" = "hq",
): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  const file = quality === "default" ? "default" : `${quality}default`;
  return `https://i.ytimg.com/vi/${id}/${file}.jpg`;
}
