import type { Metadata } from "next";
import type { ReactNode } from "react";

/** Admin login and dashboard routes are private application surfaces. */
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
