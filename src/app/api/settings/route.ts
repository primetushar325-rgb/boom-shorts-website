import { NextRequest, NextResponse } from "next/server";
import { ensureSchema } from "@/db/ensureSchema";
import { hashPassword } from "@/lib/auth";
import { isAdminAuthed, buildAdminCookie } from "@/lib/session";
import { getSettings, publicSettings, updateSettings } from "@/lib/settings";
import { revalidatePublicContent } from "@/lib/revalidatePublic";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureSchema();
  const settings = await getSettings();
  const admin = await isAdminAuthed();
  const full = req.nextUrl.searchParams.get("full");

  if (admin && full) {
    return NextResponse.json({ settings: publicSettings(settings) });
  }
  return NextResponse.json({ settings: publicSettings(settings) });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = { ...body };

  delete patch.newPassword;
  delete patch.id;
  delete patch.adminPasswordHash;
  delete patch.updatedAt;
  delete patch.totalVisitors;

  // Only known settings columns are accepted (everything else is ignored),
  // which keeps a malformed payload from breaking the settings row.
  const settings = await getSettings();
  const allowed = new Set(Object.keys(publicSettings(settings)));
  for (const key of Object.keys(patch)) {
    if (!allowed.has(key)) delete patch[key];
  }

  let passwordChanged = false;
  if (typeof body.newPassword === "string" && body.newPassword.trim().length >= 6) {
    patch.adminPasswordHash = hashPassword(body.newPassword.trim());
    passwordChanged = true;
  }

  if ("offerEndsAt" in patch) {
    const value = patch.offerEndsAt;
    patch.offerEndsAt = value ? new Date(String(value)) : null;
  }

  const updated = await updateSettings(patch as Parameters<typeof updateSettings>[0]);

  // Settings feed every public section (hero, logo, videos, contact links),
  // so purge the whole public content cache.
  revalidatePublicContent();

  const res = NextResponse.json({ settings: publicSettings(updated) });

  // Changing the admin password rotates the session cookie too, so the admin
  // stays signed in with the new hash fingerprint.
  if (passwordChanged) {
    const cookie = buildAdminCookie(updated.adminPasswordHash);
    res.cookies.set(cookie.name, cookie.value, cookie);
  }

  return res;
}
