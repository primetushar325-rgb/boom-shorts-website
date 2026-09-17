import { NextRequest, NextResponse } from "next/server";
import { getSettings, publicSettings, updateSettings } from "@/lib/settings";
import { requireAdminJson } from "@/lib/requireAdmin";
import { revokeAllAdminSessions } from "@/lib/session";
import { hashPassword } from "@/lib/auth";
import { passwordProblem, MIN_PASSWORD_LENGTH } from "@/lib/password";
import {
  asBool,
  asInt,
  asDateOrNull,
  asText,
  buildPatch,
  type FieldSpec,
} from "@/lib/adminCrud";

/**
 * GET  /api/settings — public. The customer site reads branding, payment
 * numbers and links from here. `publicSettings()` strips the admin password
 * hash, and the `full` variant strips it too, so no code path can return it.
 *
 * PATCH /api/settings — admin only.
 */

/** Explicit allowlist: anything not listed here is dropped, never written. */
const SPEC: FieldSpec = {
  siteName: asText(120),
  logoText: asText(120),
  logoUrl: asText(600),
  demoVideoUrl: asText(600),
  boomVideoUrl: asText(600),
  boomVideoThumbnailUrl: asText(600),
  serviceVideoUrl: asText(600),
  serviceVideoThumbnailUrl: asText(600),
  heroBadgeText: asText(160),
  heroTitle: asText(300),
  heroSubtitle: asText(600),
  statHappyClients: asText(60),
  statCompletedOrders: asText(60),
  statSeoOptimized: asText(60),
  whatsappNumber: asText(40),
  whatsappLink: asText(600),
  messengerLink: asText(600),
  facebookLink: asText(600),
  telegramLink: asText(600),
  bkashNumber: asText(40),
  nagadNumber: asText(40),
  rocketNumber: asText(40),
  qrCodeUrl: asText(600),
  paymentNotice: asText(2000),
  youtubeVideoUrl: asText(600),
  youtubeThumbnailUrl: asText(600),
  youtubeTitle: asText(300),
  freeVideoLink: asText(600),
  offerEnabled: asBool(),
  offerText: asText(300),
  offerEndsAt: asDateOrNull(),
};

export async function GET(req: NextRequest) {
  const s = await getSettings();
  const full = req.nextUrl.searchParams.get("full");
  if (full) {
    // Even for an authenticated admin the hash is never sent to the browser —
    // the admin UI has no use for it.
    const guard = await requireAdminJson();
    if (!guard.ok) return guard.response;
    return NextResponse.json({ settings: publicSettings(s) });
  }
  return NextResponse.json({ settings: publicSettings(s) });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdminJson();
  if (!guard.ok) return guard.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Password changes go through the same strength rules as the dedicated
  // password route, rather than accepting anything four characters long.
  let passwordHash: string | null = null;
  if (typeof body.newPassword === "string" && body.newPassword.trim().length > 0) {
    const next = body.newPassword.trim();
    const problem = passwordProblem(next);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    passwordHash = hashPassword(next);
  }

  const patch = buildPatch(body, SPEC);
  if (passwordHash) patch.adminPasswordHash = passwordHash;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await updateSettings(patch);

  if (passwordHash) {
    // Invalidate every existing admin session, exactly like
    // PATCH /api/admin/password. The previous implementation wrote the raw
    // password hash into the session cookie: that put credential material in
    // the browser, and because sessions are matched by SHA-256 digest the
    // cookie was worthless anyway — the admin was silently signed out.
    await revokeAllAdminSessions(guard.admin.id);
    return NextResponse.json(
      {
        ok: true,
        settings: publicSettings(updated),
        requireRelogin: true,
        note: `Password changed. Please sign in again on all devices (minimum ${MIN_PASSWORD_LENGTH} characters).`,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({ settings: publicSettings(updated) });
}
