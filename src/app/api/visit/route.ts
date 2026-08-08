import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { getSettings } from "@/lib/settings";

export async function POST() {
  await getSettings();
  await db
    .update(settings)
    .set({ totalVisitors: sql`${settings.totalVisitors} + 1` })
    .where(eq(settings.id, 1));
  return NextResponse.json({ ok: true });
}
