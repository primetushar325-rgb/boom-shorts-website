import { revalidatePath, revalidateTag } from "next/cache";
import { ALL_PUBLIC_TAGS, type PublicTag } from "@/lib/publicContent";

/**
 * Invalidate cached public content after an admin write so the change appears
 * on the public site right away.
 *
 * Two layers have to be purged:
 *   1. the tagged `unstable_cache` data entries, and
 *   2. the full-route ISR cache that rendered from them.
 *
 * Never throws — a failed cache purge must not turn a successful admin save
 * into an error response.
 */
export function revalidatePublicContent(...tags: PublicTag[]) {
  const list = tags.length > 0 ? tags : ALL_PUBLIC_TAGS;

  for (const tag of list) {
    try {
      // Next 16 requires an explicit cache profile; "max" purges the entry now.
      revalidateTag(tag, "max");
    } catch {
      // ignore — revalidation is best-effort
    }
  }

  // Purge the rendered public pages that consume this content.
  for (const path of ["/", "/reviews", "/free"]) {
    try {
      revalidatePath(path);
    } catch {
      // ignore
    }
  }
}
