import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../globals.css";

/**
 * ADMIN APP — separate root layout.
 *
 * This is a distinct application from the customer website: its own <html>,
 * its own theme (dark, mobile-first, Android-style), its own navigation and
 * its own auth gate. Nothing on the customer site links here.
 */
export const metadata: Metadata = {
  title: { default: "Boom Shorts Admin", template: "%s · Admin" },
  description: "Internal administration for Boom Shorts.",
  // Keep the admin out of search engines and out of link previews.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0b1220] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
