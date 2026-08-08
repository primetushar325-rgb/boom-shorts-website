import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { faqs } from "@/db/schema";
import { asc } from "drizzle-orm";
import { isAdminAuthed } from "@/lib/requireAdmin";

export async function GET() {
  const rows = await db.select().from(faqs).orderBy(asc(faqs.sortOrder), asc(faqs.id));
  return NextResponse.json({ faqs: rows });
}

export async function POST(req: NextRequest) {
  const admin = await isAdminAuthed();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const [created] = await db
    .insert(faqs)
    .values({
      question: body.question || "New question?",
      answer: body.answer || "",
      visible: body.visible ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json({ faq: created }, { status: 201 });
}
