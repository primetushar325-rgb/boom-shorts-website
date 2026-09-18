import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { put } from "@vercel/blob";
import { PAYMENT_BUCKET, PUBLIC_BUCKET } from "./constants";

/**
 * Storage helpers.
 *
 *  - Payment screenshots  -> Supabase Storage, PRIVATE bucket, served to the
 *    admin through short-lived signed URLs only.
 *  - Site images          -> Supabase Storage public bucket, or Vercel Blob.
 *  - Local development    -> a git-ignored folder on disk.
 *
 * New secure Supabase key (SUPABASE_SECRET_KEY) always wins; the legacy
 * SUPABASE_SERVICE_ROLE_KEY is only used when the new one is absent, so a stale
 * service-role key can never override the current configuration.
 */
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const supabaseSecretKey =
  (process.env.SUPABASE_SECRET_KEY ?? "").trim() ||
  (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseSecretKey);
export const isBlobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

if (
  (process.env.SUPABASE_SECRET_KEY ?? "").trim() &&
  (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim()
) {
  // Never logs the values, only the fact that both exist.
  console.warn(
    "[storage] Both SUPABASE_SECRET_KEY and SUPABASE_SERVICE_ROLE_KEY are set — using SUPABASE_SECRET_KEY.",
  );
}

const LOCAL_DIR = path.join(os.tmpdir(), "boom-shorts-uploads");

export type UploadedFile = { ref: string; url: string | null };

function extensionFor(file: File): string {
  const fromName = path.extname(file.name || "").toLowerCase();
  if (/^\.(png|jpe?g|webp|gif|avif)$/.test(fromName)) return fromName;
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/gif") return ".gif";
  return ".jpg";
}

export function buildObjectPath(prefix: string, file: File): string {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+/, "");
  return `${safePrefix}${crypto.randomBytes(8).toString("hex")}${extensionFor(file)}`;
}

// ---------------------------------------------------------------------------
// Supabase Storage REST (no extra SDK dependency)
// ---------------------------------------------------------------------------
function supabaseHeaders(extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${supabaseSecretKey}`,
    apikey: supabaseSecretKey,
    ...(extra ?? {}),
  };
}

const ensuredBuckets = new Set<string>();

async function ensureBucket(bucket: string, isPublic: boolean): Promise<void> {
  if (!isSupabaseConfigured || ensuredBuckets.has(bucket)) return;
  ensuredBuckets.add(bucket);
  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: "POST",
      headers: supabaseHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        id: bucket,
        name: bucket,
        public: isPublic,
        file_size_limit: 10 * 1024 * 1024,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      // "already exists" is the expected answer on every run after the first.
      if (!/exist|duplicate/i.test(text)) {
        console.warn(`[storage] bucket "${bucket}" could not be verified (status ${res.status})`);
      }
    }
  } catch {
    console.warn(`[storage] bucket "${bucket}" could not be verified`);
  }
}

async function uploadToSupabase(
  bucket: string,
  objectPath: string,
  file: File,
  isPublic: boolean,
): Promise<string> {
  await ensureBucket(bucket, isPublic);
  const buffer = Buffer.from(await file.arrayBuffer());
  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`,
    {
      method: "POST",
      headers: supabaseHeaders({
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false",
        "cache-control": "3600",
      }),
      body: new Uint8Array(buffer),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase upload failed (${res.status}) ${text.slice(0, 200)}`);
  }

  return isPublic
    ? `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
    : `sb://${bucket}/${objectPath}`;
}

/** Creates a short-lived signed URL for a private object. */
export async function createSignedUrl(ref: string, expiresIn = 300): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const match = ref.match(/^sb:\/\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const [, bucket, objectPath] = match;

  try {
    const res = await fetch(
      `${supabaseUrl}/storage/v1/object/sign/${bucket}/${objectPath}`,
      {
        method: "POST",
        headers: supabaseHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ expiresIn }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
    const signed = data.signedURL || data.signedUrl;
    if (!signed) return null;
    return signed.startsWith("http") ? signed : `${supabaseUrl}/storage/v1${signed}`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Local development fallback (never used on Vercel production)
// ---------------------------------------------------------------------------
async function saveLocally(objectPath: string, file: File): Promise<string> {
  const target = path.join(LOCAL_DIR, objectPath.replace(/\//g, "_"));
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(target, Buffer.from(await file.arrayBuffer()));
  return `local://${path.basename(target)}`;
}

export async function readLocal(ref: string): Promise<Buffer | null> {
  const name = ref.replace(/^local:\/\//, "");
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return null;
  try {
    return await fs.readFile(path.join(LOCAL_DIR, name));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public images (logos, banners, gallery, QR codes…)
// ---------------------------------------------------------------------------
export async function uploadPublicImage(file: File, prefix: string): Promise<UploadedFile> {
  const objectPath = buildObjectPath(prefix, file);

  if (isBlobConfigured) {
    const blob = await put(objectPath, file, {
      access: "public",
      contentType: file.type || "image/jpeg",
    });
    return { ref: blob.url, url: blob.url };
  }

  if (isSupabaseConfigured) {
    const url = await uploadToSupabase(PUBLIC_BUCKET, objectPath, file, true);
    return { ref: url, url };
  }

  const ref = await saveLocally(`public_${objectPath}`, file);
  return { ref, url: `/api/local-upload/${encodeURIComponent(ref.replace(/^local:\/\//, ""))}` };
}

// ---------------------------------------------------------------------------
// Private payment screenshots
// ---------------------------------------------------------------------------
export async function uploadPaymentScreenshot(file: File, prefix: string): Promise<UploadedFile> {
  const objectPath = buildObjectPath(prefix, file);

  if (isSupabaseConfigured) {
    const ref = await uploadToSupabase(PAYMENT_BUCKET, objectPath, file, false);
    return { ref, url: null };
  }

  // Without Supabase Storage configured we still accept the order, but the
  // screenshot is stored locally (dev only) instead of in a private bucket.
  const ref = await saveLocally(`private_${objectPath}`, file);
  return { ref, url: null };
}

export async function resolvePrivateUrl(ref: string): Promise<string | null> {
  if (!ref) return null;
  if (ref.startsWith("sb://")) return createSignedUrl(ref, 300);
  if (ref.startsWith("local://")) {
    return `/api/local-upload/${encodeURIComponent(ref.replace(/^local:\/\//, ""))}`;
  }
  if (/^https?:\/\//.test(ref)) return ref;
  return null;
}
