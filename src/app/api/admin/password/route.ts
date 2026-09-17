import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { requireAdminJson } from "@/lib/requireAdmin";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { revokeAllAdminSessions } from "@/lib/session";

/**
 * PATCH /api/admin/password — change the signed-in admin's own password.
 *
 * Requires the current password, enforces the strength rule, and revokes every
 * existing session so a stolen cookie dies with the old password.
 */
export async function PATCH(req: NextRequest) {
  const guard = await requireAdminJson();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";

  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, guard.admin.id))
    .limit(1);
  if (!admin) return NextResponse.json({ error: "Admin account not found" }, { status: 404 });

  if (!verifyPassword(current, admin.passwordHash)) {
    return NextResponse.json({ error: "Your current password is incorrect." }, { status: 401 });
  }

  const problem = passwordProblem(next);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  await db
    .update(adminUsers)
    .set({ passwordHash: hashPassword(next), mustChangePassword: false })
    .where(eq(adminUsers.id, admin.id));

  await revokeAllAdminSessions(admin.id);

  return NextResponse.json({
    ok: true,
    note: "Password changed. Please sign in again on all devices.",
  });
}
