import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mihad Boom Shorts – Premium YouTube Shorts & SEO Services",
  description:
    "Order high-quality Boom Shorts, professional voice over videos, thumbnails, SEO and complete YouTube channel management.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}
