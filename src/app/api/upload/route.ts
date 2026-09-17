import { NextRequest, NextResponse } from "next/server";
import { uploadScreenshot, validateImageFile } from "@/lib/storage";
import { verifyUploadToken } from "@/lib/uploadToken";
import { isAdminAuthed } from "@/lib/requireAdmin";

/**
 * POST /api/upload — payment screenshot (customer) or admin image.
 *
 * Authorisation: either a signed checkout upload token, or an admin session.
 * This closes the previous hole where anyone could write to storage.
 */
export async function POST(req: NextRequest) {
  const admin = await isAdminAuthed();
  const token = req.headers.get("x-upload-token");

  if (!admin && !verifyUploadToken(token)) {
    return NextResponse.json(
      { error: "Upload session expired. Please reload the checkout page and try again." },
      { status: 401 },
    );
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const problem = validateImageFile(file);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    const result = await uploadScreenshot(file);
    return NextResponse.json({
      // `path` is what gets stored in the database; `url` is display-only.
      path: result.path,
      url: result.url,
      backend: result.backend,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[upload] failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
