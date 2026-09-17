import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

export type Settings = typeof settings.$inferSelect;

/**
 * Singleton settings row (id = 1).
 *
 * Unlike the original implementation this no longer seeds a default admin
 * password (`admin123`) into the database. Admin credentials now live in
 * `admin_users` with scrypt hashes — see src/lib/adminBootstrap.ts.
 */
export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (rows.length > 0) return rows[0];

  const [created] = await db
    .insert(settings)
    .values({ id: 1 })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  // Lost the insert race against another request — read the winner's row.
  const retry = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (retry[0]) return retry[0];
  throw new Error("Could not initialise the settings row.");
}

const NON_PATCHABLE = new Set(["id", "adminPasswordHash", "newPassword", "currentPassword"]);

/** Applies a partial update, ignoring keys that must never be set this way. */
export async function updateSettings(patch: Record<string, unknown>): Promise<Settings> {
  await getSettings();

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (NON_PATCHABLE.has(key)) continue;
    clean[key] = value;
  }
  clean.updatedAt = new Date();

  const [updated] = await db.update(settings).set(clean).where(eq(settings.id, 1)).returning();
  return updated;
}

/** Columns that are safe to render on the public customer site. */
export function publicSettings(s: Settings) {
  const { adminPasswordHash: _hash, ...pub } = s;
  void _hash;
  return pub;
}
