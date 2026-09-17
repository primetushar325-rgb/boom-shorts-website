import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { hashPassword, needsRehash, passwordProblem, verifyPassword } from "./password";
import { getSettings } from "./settings";

/**
 * Admin account bootstrap.
 *
 * The original system had no user table at all — a single shared password
 * (default `admin123`) whose hash doubled as the session cookie. This replaces
 * it with real per-user accounts while keeping the existing owner locked in:
 *
 *  1. If ADMIN_EMAIL / ADMIN_PASSWORD are set and no admin exists, create it.
 *  2. Otherwise, if the legacy shared password is set, the first successful
 *     legacy login promotes the caller into a real admin account (and forces a
 *     password change) so nobody is locked out of an existing installation.
 *  3. If neither exists, `/admin/login` shows a one-time setup form. That form
 *     is only served while the admin table is empty, so it is not a public
 *     registration hole.
 */

export const DEFAULT_ADMIN_EMAIL = "admin@boomshorts.local";

export async function countAdminUsers(): Promise<number> {
  const rows = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  return rows.length;
}

export async function needsAdminSetup(): Promise<boolean> {
  const [row] = await db
    .select({ n: adminUsers.id })
    .from(adminUsers)
    .limit(1);
  if (row) return false;

  // Env-provided credentials get provisioned automatically on first touch.
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password && !passwordProblem(password)) {
    await createAdminUser({ email, password, name: "Administrator" }).catch((err) => {
      console.error("[admin] env bootstrap failed:", err?.message ?? err);
    });
    return false;
  }
  return true;
}

export async function createAdminUser(opts: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const email = opts.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };

  const problem = passwordProblem(opts.password);
  if (problem) return { ok: false, error: problem };

  const existing = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (existing.length) return { ok: false, error: "An admin with that email already exists." };

  const [created] = await db
    .insert(adminUsers)
    .values({
      email,
      name: opts.name?.trim() || "Administrator",
      passwordHash: hashPassword(opts.password),
      role: "admin",
      active: true,
      mustChangePassword: false,
    })
    .returning({ id: adminUsers.id });

  return { ok: true, id: created.id };
}

export type AdminCredentialCheck =
  | { ok: true; adminId: number; email: string; name: string; mustChangePassword: boolean }
  | { ok: false; error: string };

/**
 * Verifies credentials against a real admin account, falling back once to the
 * legacy shared password so existing installs survive the upgrade.
 */
export async function checkAdminCredentials(
  email: string,
  password: string,
): Promise<AdminCredentialCheck> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) return { ok: false, error: "Enter your email and password." };

  const rows = await db.select().from(adminUsers).where(eq(adminUsers.email, normalized)).limit(1);
  const admin = rows[0];

  if (admin) {
    if (!admin.active) return { ok: false, error: "This admin account is disabled." };
    if (!verifyPassword(password, admin.passwordHash)) {
      return { ok: false, error: "Incorrect email or password." };
    }
    // Transparently upgrade any legacy-format hash on a successful login.
    if (needsRehash(admin.passwordHash)) {
      await db
        .update(adminUsers)
        .set({ passwordHash: hashPassword(password) })
        .where(eq(adminUsers.id, admin.id));
    }
    await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, admin.id));
    return {
      ok: true,
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
      mustChangePassword: admin.mustChangePassword,
    };
  }

  // Legacy path: no admin_users row yet, but the old shared password exists.
  const settings = await getSettings();
  if (settings.adminPasswordHash && verifyPassword(password, settings.adminPasswordHash)) {
    const created = await createAdminUser({
      email: normalized,
      password,
      name: "Administrator",
    });
    if (created.ok) {
      await db.update(adminUsers).set({ mustChangePassword: true }).where(eq(adminUsers.id, created.id));
      return { ok: true, adminId: created.id, email: normalized, name: "Administrator", mustChangePassword: true };
    }
  }

  return { ok: false, error: "Incorrect email or password." };
}
