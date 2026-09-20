import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { settings } from "@/db/schema";
import { withDbRetry } from "./dbRetry";
import { hashPassword } from "./auth";

export type Settings = typeof settings.$inferSelect;

const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || "admin123";

/**
 * Per-request memoized settings read.
 *
 * The layout and the page both need settings; `React.cache` de-duplicates that
 * into a single query per request instead of two.
 */
export const getSettings = cache(getSettingsUncached);

async function getSettingsUncached(): Promise<Settings> {
  await ensureSchema();

  // The retry lives HERE, below `React.cache`. `cache()` memoizes the promise a
  // request produced — *including a rejected one* — so retrying by calling
  // `getSettings()` again within the same request would only replay the same
  // failure. Retrying the query itself lets the Pool discard the dead socket
  // and hand out a fresh connection.
  //
  // This read backs `getPublicSettings()`, which the `(site)` layout awaits for
  // every page including /checkout/[id]; an unguarded throw here took the whole
  // shell down with it.
  const rows = await withDbRetry(
    () => db.select().from(settings).where(eq(settings.id, 1)).limit(1),
    { label: "settings read" },
  );
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
