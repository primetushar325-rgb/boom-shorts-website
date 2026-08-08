import { db } from "@/db";
import { proofSlides } from "@/db/schema";

const DEFAULT_PROOF_IMAGES = Array.from({ length: 19 }, (_, i) => i + 1).map((n) => {
  // matches the file extensions actually placed in /public/proof
  const pngIndexes = [3, 4, 8, 19];
  const ext = pngIndexes.includes(n) ? "png" : "jpg";
  return `/proof/${n}.${ext}`;
});

/**
 * Seeds the "Client Review" slider with the starter screenshots once, if the
 * table is empty. Safe to call on every homepage load — it's a no-op after
 * the first run. Delete the rows from the admin panel any time to remove them.
 */
export async function ensureProofSlideSeed() {
  const existing = await db.select({ id: proofSlides.id }).from(proofSlides).limit(1);
  if (existing.length > 0) return;

  await db.insert(proofSlides).values(
    DEFAULT_PROOF_IMAGES.map((imageUrl, idx) => ({
      imageUrl,
      caption: "",
      visible: true,
      sortOrder: idx,
    })),
  );
}
