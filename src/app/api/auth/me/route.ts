import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const authed = await isAdminAuthed();
  return NextResponse.json({ authed });
}
