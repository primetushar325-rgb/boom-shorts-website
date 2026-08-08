import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/constants";

// Lightweight gate: only checks cookie *presence*. Full cryptographic
// verification (against the current password hash, which can change)
// happens server-side in the admin layout and API route handlers.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
    if (!cookie) {
      const loginUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
