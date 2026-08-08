import { NextRequest, NextResponse } from "next/server";
import { getSettings, publicSettings, updateSettings } from "@/lib/settings";
import { isAdminAuthed } from "@/lib/requireAdmin";
import { hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const s = await getSettings();
  const admin = await isAdminAuthed();
  const full = req.nextUrl.searchParams.get("full");
  if (admin && full) {
    return NextResponse.json({ settings: { ...s, adminPasswordHash: undefined } });
  }
  return NextResponse.json({ settings: publicSettings(s) });
}

export async function PATCH(req: NextRequest) {
  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { ...body };

  delete patch.newPassword;
  delete patch.id;
  delete patch.adminPasswordHash;

  if (typeof body.newPassword === "string" && body.newPassword.trim().length >= 4) {
    patch.adminPasswordHash = hashPassword(body.newPassword.trim());
  }
  if (patch.offerEndsAt && typeof patch.offerEndsAt === "string") {
    patch.offerEndsAt = patch.offerEndsAt.length > 0 ? new Date(patch.offerEndsAt) : null;
  }

  const updated = await updateSettings(patch);
  const res = NextResponse.json({ settings: { ...updated, adminPasswordHash: undefined } });

  if (typeof body.newPassword === "string" && body.newPassword.trim().length >= 4) {
    const { ADMIN_COOKIE } = await import("@/lib/auth");
    res.cookies.set(ADMIN_COOKIE, updated.adminPasswordHash, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return res;
}
