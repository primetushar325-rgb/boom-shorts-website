import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ authed: false });
  return NextResponse.json({
    authed: true,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    mustChangePassword: admin.mustChangePassword,
  });
}
