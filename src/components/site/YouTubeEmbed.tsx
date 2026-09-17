import { extractYouTubeId, youtubeEmbedUrl, youtubeThumbnailUrl } from "@/lib/youtube";
import YouTubeFrame from "./YouTubeFrame";

/**
 * Responsive 16:9 YouTube embed.
 *
 * Click-to-load: the heavy iframe is inserted only after the user taps the
 * poster, keeping the YouTube player off the critical path on the homepage and
 * on checkout. The video id is extracted server-side from whatever URL shape
 * the admin pasted (watch / youtu.be / shorts / embed / bare id).
 */
export default function YouTubeEmbed({
  url,
  title,
  className = "",
}: {
  url: string | null | undefined;
  title: string;
  className?: string;
}) {
  const id = extractYouTubeId(url);
  if (!id) return null;

  const embed = youtubeEmbedUrl(url);
  if (!embed) return null;

  return (
    <YouTubeFrame
      embed={embed}
      poster={youtubeThumbnailUrl(url, "hq")}
      title={title}
      className={className}
    />
  );
}
