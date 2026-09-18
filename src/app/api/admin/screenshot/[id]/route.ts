import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { orders } from "@/db/schema";
import { isAdminAuthed } from "@/lib/session";
import { resolvePrivateUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Admin-only payment screenshot access. The stored value is a private object
 * reference (sb://bucket/path) or a local dev file — never a public URL — so a
 * customer can never open somebody else's screenshot.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const rows = await db
    .select({ screenshotUrl: orders.screenshotUrl })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  const ref = rows[0]?.screenshotUrl;
  if (!ref) return NextResponse.json({ error: "No screenshot for this order" }, { status: 404 });

  const url = await resolvePrivateUrl(ref);
  if (!url) {
    return NextResponse.json(
      { error: "Screenshot storage is not configured (SUPABASE_SECRET_KEY missing)." },
      { status: 503 },
    );
  }

  // redirect() needs an absolute URL; the ref may be a relative dev path.
  return NextResponse.redirect(new URL(url, req.nextUrl.origin), { status: 302 });
}
