import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mihad Boom — Official Website",
    template: "%s | Mihad Boom",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Mihad Boom",
    "Mihad Boom Shorts",
    "YouTube Shorts service",
    "voice-over videos",
    "YouTube channel management",
    "thumbnail design",
    "YouTube SEO",
    "Bangladesh video editing service",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  manifest: "/manifest.json",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink text-warm-dim antialiased">{children}</body>
    </html>
  );
}
