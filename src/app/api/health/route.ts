import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { isSupabaseConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      storage: isSupabaseConfigured ? "supabase" : "local",
      schemaVersion: 3,
    });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
