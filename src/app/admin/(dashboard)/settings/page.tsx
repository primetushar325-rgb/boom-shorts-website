"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Settings = {
  siteName: string;
  logoUrl: string;
  heroBadgeText: string;
  heroTitle: string;
  heroSubtitle: string;
  statHappyClients: string;
  statCompletedOrders: string;
  statSeoOptimized: string;
  whatsappNumber: string;
  whatsappLink: string;
  facebookLink: string;
  messengerLink: string;
  telegramLink: string;
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  qrCodeUrl: string;
  paymentNotice: string;
  freeVideoLink: string;
  demoVideoUrl: string;
  youtubeVideoUrl: string;
  youtubeTitle: string;
};

const TEXT_FIELDS: { key: keyof Settings; label: string; hint?: string }[] = [
  { key: "siteName", label: "Business Name" },
  { key: "logoUrl", label: "Logo URL", hint: "/logo.png or a full https URL" },
  { key: "whatsappNumber", label: "WhatsApp Number", hint: "Used by the floating help button" },
  { key: "bkashNumber", label: "bKash Number" },
  { key: "nagadNumber", label: "Nagad Number" },
  { key: "rocketNumber", label: "Rocket Number" },
  { key: "qrCodeUrl", label: "Payment QR Code URL" },
  { key: "paymentNotice", label: "Payment Notice" },
  { key: "facebookLink", label: "Facebook Link" },
  { key: "messengerLink", label: "Messenger Link" },
  { key: "telegramLink", label: "Telegram Link" },
  { key: "freeVideoLink", label: "Free Video Link" },
  { key: "demoVideoUrl", label: "Demo Video URL" },
  { key: "heroBadgeText", label: "Hero Badge" },
  { key: "heroTitle", label: "Hero Title" },
  { key: "statHappyClients", label: "Stat — Happy Clients" },
  { key: "statCompletedOrders", label: "Stat — Completed Orders" },
  { key: "statSeoOptimized", label: "Stat — SEO Optimized" },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMessage, setPwMessage] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    fetch("/api/settings?full=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSettings(d?.settings ?? null))
      .finally(() => setLoading(false));
  }, []);

  function set(key: keyof Settings, value: string) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Could not save settings.");
      return;
    }
    setMessage("✓ Settings saved. The website reflects this immediately.");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwBusy(true);
    setPwMessage("");
    const res = await fetch("/api/admin/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setPwBusy(false);
    if (!res.ok) {
      setPwMessage(data.error || "Could not change the password.");
      return;
    }
    setPwMessage("✓ Password changed. Please sign in again.");
    setCurrentPassword("");
    setNewPassword("");
    setTimeout(() => router.push("/admin/login"), 1500);
  }

  if (loading) {
    return <div className="space-y-2">{[0,1,2,3].map((i) => <div key={i} className="bs-skeleton h-16 rounded-2xl" />)}</div>;
  }
  if (!settings) {
    return <p className="text-sm text-slate-400">Could not load settings.</p>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-white">Settings</h1>
        <p className="mt-0.5 text-xs text-slate-400">
          Site-wide values. Nothing secret belongs here — use deployment environment variables.
        </p>
      </div>

      {message ? (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-slate-200">
          {message}
        </p>
      ) : null}

      <div className="space-y-3">
        {TEXT_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {f.label}
            </span>
            <input
              value={String(settings[f.key] ?? "")}
              onChange={(e) => set(f.key, e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-bs-primary"
            />
            {f.hint ? <span className="mt-1 block text-[10px] text-slate-500">{f.hint}</span> : null}
          </label>
        ))}

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Hero Subtitle
          </span>
          <textarea
            rows={3}
            value={settings.heroSubtitle}
            onChange={(e) => set("heroSubtitle", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-bs-primary"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-5 w-full rounded-xl bg-bs-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Settings"}
      </button>

      <form onSubmit={changePassword} className="mt-8 rounded-2xl border border-white/10 bg-[#0e1628] p-4">
        <h2 className="text-sm font-extrabold text-white">🔐 Change Admin Password</h2>
        <p className="mt-1 text-[11px] text-slate-400">
          At least 8 characters with one letter and one number. All sessions are signed out.
        </p>

        <div className="mt-3 space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-bs-primary"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-bs-primary"
          />
        </div>

        {pwMessage ? (
          <p className="mt-3 text-xs font-semibold text-emerald-300">{pwMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={pwBusy}
          className="mt-3 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {pwBusy ? "Updating…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}
