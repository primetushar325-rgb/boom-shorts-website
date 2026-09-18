/**
 * Browser-side payment screenshot preparation.
 *
 * WHY THIS EXISTS
 * ---------------
 * Phone screenshots are routinely 4–10 MB. Vercel rejects a request body larger
 * than 4.5 MB at the platform edge — *before* any of our code runs — so the
 * browser received an HTML 413 instead of JSON and the checkout form reported a
 * generic failure for an order that was perfectly valid.
 *
 * Re-encoding in the browser keeps the upload small (typically 150–400 KB),
 * which also makes it dramatically faster on a mobile connection. The original
 * file is used unchanged when it is already small, and any failure here falls
 * back to the original file so a screenshot can never block an order.
 *
 * Client-only module (uses `document` / canvas).
 */

export type PreparedScreenshot = {
  /** The file to upload — the original when compression was not possible. */
  file: File;
  /** False when the image could not be decoded at all. */
  ok: boolean;
  /** True when we actually re-encoded it. */
  compressed: boolean;
  bytes: number;
};

/** Above this the original file is sent untouched — not worth re-encoding. */
const SKIP_BELOW = 700 * 1024;
/** Hard ceiling we try to stay under (Vercel's limit is 4.5 MB for the body). */
const TARGET_BYTES = 2_200_000;

type Pass = { maxSide: number; quality: number };

// Successively smaller/softer until the result fits. The first pass already
// keeps a payment screenshot perfectly legible (transaction ID readable).
const PASSES: Pass[] = [
  { maxSide: 1600, quality: 0.82 },
  { maxSide: 1280, quality: 0.72 },
  { maxSide: 1024, quality: 0.62 },
];

function canUseCanvas(): boolean {
  return typeof document !== "undefined" && typeof HTMLCanvasElement !== "undefined";
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode the image"));
    };
    image.decoding = "async";
    image.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

/**
 * Returns the file to upload. Never throws: on any problem the caller gets the
 * original file back (and `ok: false` when it could not even be decoded, so the
 * UI can tell the customer the order will still go through without it).
 */
export async function compressScreenshot(file: File): Promise<PreparedScreenshot> {
  const asIs: PreparedScreenshot = { file, ok: true, compressed: false, bytes: file.size };

  if (file.size <= SKIP_BELOW) return asIs;
  if (!/^image\//.test(file.type)) return asIs;
  if (!canUseCanvas()) return asIs;

  let image: HTMLImageElement;
  try {
    image = await loadImage(file);
  } catch {
    return { file, ok: false, compressed: false, bytes: file.size };
  }

  if (!image.naturalWidth || !image.naturalHeight) {
    return { file, ok: false, compressed: false, bytes: file.size };
  }

  let best: PreparedScreenshot = asIs;

  for (const pass of PASSES) {
    const scale = Math.min(1, pass.maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) break;

      // Payment screenshots have no transparency; a white base avoids the black
      // background JPEG would otherwise produce for a transparent PNG.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, width, height);

      const blob = await toBlob(canvas, pass.quality);
      canvas.width = 0;
      canvas.height = 0;
      if (!blob || blob.size === 0) continue;

      // Only accept a result that is actually smaller than what we had.
      if (blob.size < best.bytes) {
        const name = (file.name || "screenshot").replace(/\.[a-z0-9]+$/i, "") + ".jpg";
        best = {
          file: new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }),
          ok: true,
          compressed: true,
          bytes: blob.size,
        };
      }

      if (best.bytes <= TARGET_BYTES) break;
    } catch {
      // Keep whatever we already have and try the next pass.
      continue;
    }
  }

  return best;
}
