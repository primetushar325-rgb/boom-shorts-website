import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/session";
import { readLocal } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Serves files stored by the local development fallback (when neither Supabase
 * Storage nor Vercel Blob is configured). Disabled in production, and private
 * files are only readable by an authenticated admin.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { name } = await params;
  const decoded = decodeURIComponent(name);

  if (decoded.startsWith("private_") && !(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const buffer = await readLocal(decoded);
  if (!buffer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lower = decoded.toLowerCase();
  const type = lower.endsWith(".png")
    ? "image/png"
    : lower.endsWith(".webp")
      ? "image/webp"
      : lower.endsWith(".gif")
        ? "image/gif"
        : "image/jpeg";

  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": type, "Cache-Control": "no-store" },
  });
}
