import { NextRequest, NextResponse } from "next/server";
import { signedScreenshotUrl } from "@/lib/storage";
import { requireAdminJson } from "@/lib/requireAdmin";

/**
 * GET /api/payments/screenshot?path=… — admin only.
 *
 * Mints a short-lived signed URL for a privately stored screenshot. The object
 * path is never exposed publicly and the bucket stays private.
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdminJson();
  if (!guard.ok) return guard.response;

  const path = new URL(req.url).searchParams.get("path");
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

  const url = await signedScreenshotUrl(path, 60 * 10);
  if (!url) {
    return NextResponse.json(
      { error: "Screenshot is not available. Check that Supabase Storage is configured." },
      { status: 404 },
    );
  }
  return NextResponse.json({ url });
}
