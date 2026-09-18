import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/session";
import { uploadPublicImage } from "@/lib/storage";

export const dynamic = "force-dynamic";

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/avif"];
const MAX_SIZE = 8 * 1024 * 1024;

/** Admin-only image upload (logos, banners, gallery, QR codes, thumbnails). */
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  try {
    const uploaded = await uploadPublicImage(file, "uploads/");
    return NextResponse.json({ url: uploaded.url ?? uploaded.ref });
  } catch (error) {
    console.error("[upload] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Image upload failed. Please try again." },
      { status: 500 },
    );
  }
}
