import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../globals.css";
import SiteHelp from "@/components/site/SiteHelp";

export const metadata: Metadata = {
  title: {
    default: "Boom Shorts — Premium YouTube Shorts & SEO Services",
    template: "%s · Boom Shorts",
  },
  description:
    "Order high-quality Boom Shorts, voice over videos, thumbnails and full YouTube channel management. Fast delivery, real client results.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Boom Shorts — Premium YouTube Shorts & SEO Services",
    description:
      "Ready-to-upload Boom Shorts, voice overs, thumbnails and channel SEO. Trusted seller, fast delivery.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bs-bg text-bs-ink antialiased">
        {children}
        <SiteHelp />
      </body>
    </html>
  );
}
