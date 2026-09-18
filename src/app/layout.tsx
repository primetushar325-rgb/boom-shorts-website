import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://boom-shorts-website.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Boom Shorts — Premium YouTube Shorts, Voice Over & SEO Services",
    template: "%s | Boom Shorts",
  },
  description:
    "Order high-quality Boom Shorts, voice over videos, thumbnails, SEO and complete YouTube channel management. Fast delivery, trusted seller, ready-to-upload content.",
  keywords: [
    "Boom Shorts",
    "YouTube Shorts service",
    "voice over shorts",
    "YouTube channel management",
    "thumbnail design",
    "YouTube SEO",
    "Bangladesh video editing service",
  ],
  applicationName: "Boom Shorts",
  manifest: "/manifest.json",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Boom Shorts",
    title: "Boom Shorts — Premium YouTube Shorts & Video Services",
    description:
      "High retention Boom Shorts, voice over videos, thumbnails and complete channel management. Order online with bKash or Nagad.",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "Boom Shorts" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Boom Shorts — Premium YouTube Shorts & Video Services",
    description:
      "High retention Boom Shorts, voice over videos, thumbnails and complete channel management.",
    images: ["/logo.png"],
  },
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
