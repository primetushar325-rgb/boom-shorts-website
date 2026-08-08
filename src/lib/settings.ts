import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";

export type Settings = typeof settings.$inferSelect;

const DEFAULT_ADMIN_PASSWORD = "admin123";

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (rows.length > 0) return rows[0];

  const [created] = await db
    .insert(settings)
    .values({
      id: 1,
      adminPasswordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  const retry = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  return retry[0];
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  await getSettings();
  const { id: _ignoreId, ...rest } = patch;
  void _ignoreId;
  const [updated] = await db
    .update(settings)
    .set({ ...rest, updatedAt: new Date() })
    .where(eq(settings.id, 1))
    .returning();
  return updated;
}

// Fields safe to expose to the public site (no password hash etc.)
export function publicSettings(s: Settings) {
  const { adminPasswordHash: _hash, ...pub } = s;
  void _hash;
  return pub;
}
