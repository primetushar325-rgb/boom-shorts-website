import type { Metadata } from "next";
import ProfileView from "@/components/ProfileView";
import SitePageHeader from "@/components/SitePageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile",
  description: "Sign in to see your Boom Shorts order history.",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <main className="min-h-screen">
      <SitePageHeader
        title="Profile"
        subtitle="Sign in with the WhatsApp number and PIN you used while ordering."
      />
      <div className="mx-auto max-w-md px-4 py-5">
        <ProfileView />
      </div>
    </main>
  );
}
