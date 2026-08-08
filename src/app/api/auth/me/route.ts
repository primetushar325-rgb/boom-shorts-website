import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/requireAdmin";

export async function GET() {
  const authed = await isAdminAuthed();
  return NextResponse.json({ authed });
}
