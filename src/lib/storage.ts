import crypto from "crypto";
import path from "path";
import { put } from "@vercel/blob";

/**
 * Payment screenshot storage.
 *
 * Primary backend: a PRIVATE Supabase Storage bucket. Only the object *path*
 * is written to the database; image bytes never live in a table column. Admins
 * view screenshots through short-lived signed URLs minted server-side.
 *
 * Fallback: Vercel Blob. Note that Blob objects are PUBLIC, and a payment
 * screenshot contains a transaction id and a phone number, so the fallback is
 * OFF unless `ALLOW_PUBLIC_SCREENSHOT_FALLBACK=true` is set explicitly. Without
 * Supabase Storage configured the upload fails loudly instead of quietly
 * publishing customer payment evidence to an unauthenticated URL.
 *
 * Required env for the primary backend:
 *   SUPABASE_URL                e.g. https://xyz.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   server-side secret — never sent to the browser
 * Optional:
 *   SUPABASE_SCREENSHOT_BUCKET  default "payment-screenshots"
 */

export const SCREENSHOT_BUCKET = process.env.SUPABASE_SCREENSHOT_BUCKET || "payment-screenshots";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export type StorageBackend = "supabase" | "vercel-blob";

export type UploadResult = {
  backend: StorageBackend;
  /** Supabase object path, or an absolute URL when using the blob fallback */
  path: string;
  /** Immediately displayable URL (signed for Supabase, public for blob) */
  url: string;
};

export function supabaseStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function validateImageFile(file: File): string | null {
  if (!file || file.size === 0) return "Please choose a screenshot to upload.";
  if (file.size > MAX_BYTES) return "Screenshot is too large (max 8MB).";
  if (!ALLOWED_TYPES.has(file.type.toLowerCase())) {
    return "Only PNG, JPG, WEBP or GIF screenshots are allowed.";
  }
  return null;
}

function safeExt(name: string, type: string): string {
  const fromName = path.extname(name || "").toLowerCase();
  if (/^\.(png|jpe?g|webp|gif)$/.test(fromName)) return fromName === ".jpeg" ? ".jpg" : fromName;
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  return ".jpg";
}

/** yyyy/mm/<random>.jpg — keeps the bucket navigable and unguessable. */
function buildObjectPath(file: File): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const rand = crypto.randomBytes(10).toString("hex");
  return `screenshots/${yyyy}/${mm}/${Date.now()}-${rand}${safeExt(file.name, file.type)}`;
}

function serviceHeaders(): { Authorization: string; apikey: string } {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  return { Authorization: `Bearer ${key}`, apikey: key };
}

async function uploadToSupabase(file: File): Promise<UploadResult> {
  const base = (process.env.SUPABASE_URL as string).replace(/\/+$/, "");
  const objectPath = buildObjectPath(file);
  const buffer = Buffer.from(await file.arrayBuffer());

  const res = await fetch(`${base}/storage/v1/object/${SCREENSHOT_BUCKET}/${objectPath}`, {
    method: "POST",
    headers: {
      ...serviceHeaders(),
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false",
    },
    body: buffer,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Supabase Storage upload failed (${res.status}). ${
        res.status === 404
          ? `Bucket "${SCREENSHOT_BUCKET}" may not exist — create it as a PRIVATE bucket.`
          : detail.slice(0, 200)
      }`,
    );
  }

  const signed = await signedScreenshotUrl(objectPath).catch(() => null);
  return { backend: "supabase", path: objectPath, url: signed ?? "" };
}

async function uploadToBlob(file: File): Promise<UploadResult> {
  const ext = safeExt(file.name, file.type);
  const filename = `screenshots/${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const blob = await put(filename, file, { access: "public", contentType: file.type });
  return { backend: "vercel-blob", path: blob.url, url: blob.url };
}

/**
 * The Blob fallback is opt-in because Blob objects are public.
 * Only "true"/"1"/"yes" enable it — a commented-out or empty value does not.
 */
export function publicFallbackAllowed(): boolean {
  return /^(true|1|yes)$/i.test((process.env.ALLOW_PUBLIC_SCREENSHOT_FALLBACK || "").trim());
}

/** Uploads a payment screenshot, preferring Supabase Storage. */
export async function uploadScreenshot(file: File): Promise<UploadResult> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);

  if (supabaseStorageConfigured()) return uploadToSupabase(file);

  if (!publicFallbackAllowed()) {
    throw new Error(
      "Screenshot storage is not configured. Set SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY so screenshots are stored in a private bucket.",
    );
  }
  return uploadToBlob(file);
}

/**
 * Mints a short-lived signed URL for a stored screenshot.
 * Absolute http(s) values (legacy rows / blob fallback) are returned as-is.
 */
export async function signedScreenshotUrl(
  storedPath: string | null | undefined,
  expiresInSeconds = 60 * 10,
): Promise<string | null> {
  if (!storedPath) return null;
  if (/^https?:\/\//i.test(storedPath)) return storedPath;
  if (!supabaseStorageConfigured()) return null;

  const base = (process.env.SUPABASE_URL as string).replace(/\/+$/, "");
  const res = await fetch(`${base}/storage/v1/object/sign/${SCREENSHOT_BUCKET}/${storedPath}`, {
    method: "POST",
    headers: { ...serviceHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
  const signed = data.signedURL ?? data.signedUrl;
  return signed ? `${base}/storage/v1${signed.startsWith("/") ? "" : "/"}${signed}` : null;
}
