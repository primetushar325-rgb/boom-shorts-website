"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, PageHeader, TextArea, TextInput, Toggle } from "@/components/admin/ui";

type SettingsData = {
  siteName: string;
  logoUrl: string;
  demoVideoUrl: string;
  boomVideoUrl: string;
  serviceVideoUrl: string;
  heroBadgeText: string;
  heroTitle: string;
  heroSubtitle: string;
  statHappyClients: string;
  statCompletedOrders: string;
  statSeoOptimized: string;
  whatsappNumber: string;
  whatsappLink: string;
  messengerLink: string;
  facebookLink: string;
  telegramLink: string;
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  qrCodeUrl: string;
  paymentNotice: string;
  youtubeVideoUrl: string;
  youtubeThumbnailUrl: string;
  youtubeTitle: string;
  freeVideoLink: string;
  offerEnabled: boolean;
  offerText: string;
  offerEndsAt: string | null;
};

function toLocalInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [uploading, setUploading] = useState(false);

  async function load() {
    const res = await fetch("/api/settings?full=1");
    const data = await res.json();
    setSettings(data.settings);
  }

  useEffect(() => {
    load();
  }, []);

  async function uploadQr(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (res.ok && settings) setSettings({ ...settings, qrCodeUrl: data.url });
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (res.ok && settings) setSettings({ ...settings, logoUrl: data.url });
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setSavedMsg("");
    const payload: Record<string, unknown> = { ...settings };
    if (newPassword.trim()) payload.newPassword = newPassword.trim();
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSavedMsg("✅ Settings saved successfully!");
        setNewPassword("");
      }
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(""), 3000);
    }
  }

  if (!settings) return <p className="text-sm text-slate-500">Loading...</p>;

  const set = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) =>
    setSettings({ ...settings, [key]: value });

  return (
    <div>
      <PageHeader title="Website Settings" subtitle="Everything global — payments, socials, video & more." />

      <div className="grid gap-6">
        <Card>
          <p className="mb-4 font-bold text-white">🏠 Site & Hero</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Site Name">
              <TextInput value={settings.siteName} onChange={(e) => set("siteName", e.target.value)} />
            </Field>
            <Field label="Hero Badge Text">
              <TextInput value={settings.heroBadgeText} onChange={(e) => set("heroBadgeText", e.target.value)} />
            </Field>
            <Field label="Hero Title">
              <TextInput className="sm:col-span-2" value={settings.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} />
            </Field>
            <Field label="Hero Subtitle">
              <TextArea
                rows={2}
                className="sm:col-span-2"
                value={settings.heroSubtitle}
                onChange={(e) => set("heroSubtitle", e.target.value)}
              />
            </Field>
            <Field label="Stat: Happy Clients">
              <TextInput value={settings.statHappyClients} onChange={(e) => set("statHappyClients", e.target.value)} />
            </Field>
            <Field label="Stat: Completed Orders">
              <TextInput
                value={settings.statCompletedOrders}
                onChange={(e) => set("statCompletedOrders", e.target.value)}
              />
            </Field>
            <Field label="Stat: SEO Optimized">
              <TextInput value={settings.statSeoOptimized} onChange={(e) => set("statSeoOptimized", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <p className="mb-4 font-bold text-white">🏆 Logo</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Logo Image URL">
              <TextInput value={settings.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} />
            </Field>
            <Field label="Or Upload Logo">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                className="text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-slate-950"
              />
            </Field>
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt="Logo preview" className="h-16 w-16 rounded-full object-cover" />
            ) : null}
          </div>
        </Card>

        <Card>
          <p className="mb-4 font-bold text-white">▶ Demo Button Video</p>
          <Field label="Demo Video Link (Google Drive share link or YouTube URL)">
            <TextInput value={settings.demoVideoUrl} onChange={(e) => set("demoVideoUrl", e.target.value)} />
          </Field>
          <p className="mt-2 text-xs text-slate-500">Shown when a visitor taps the &quot;Demo&quot; button at the top of the homepage.</p>
        </Card>

        <Card>
          <p className="mb-4 font-bold text-white">🎬 Section Auto-play Videos</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Boom Shorts Packages — Video URL (YouTube)">
              <TextInput value={settings.boomVideoUrl} onChange={(e) => set("boomVideoUrl", e.target.value)} />
            </Field>
            <Field label="Other Services — Video URL (YouTube)">
              <TextInput value={settings.serviceVideoUrl} onChange={(e) => set("serviceVideoUrl", e.target.value)} />
            </Field>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            These videos auto-play (muted) when a visitor scrolls to that section, and pause when they scroll away.
          </p>
        </Card>

        <Card>
          <p className="mb-4 font-bold text-white">🔥 Offer Countdown Timer</p>
          <label className="mb-4 flex items-center gap-2 text-sm text-slate-300">
            <Toggle checked={settings.offerEnabled} onChange={(v) => set("offerEnabled", v)} /> Enable countdown on
            homepage
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Offer Text">
              <TextInput value={settings.offerText} onChange={(e) => set("offerText", e.target.value)} />
            </Field>
            <Field label="Ends At">
              <TextInput
                type="datetime-local"
                value={toLocalInput(settings.offerEndsAt)}
                onChange={(e) => set("offerEndsAt", e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <p className="mb-4 font-bold text-white">🎬 Featured YouTube Video</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Video Title">
              <TextInput value={settings.youtubeTitle} onChange={(e) => set("youtubeTitle", e.target.value)} />
            </Field>
            <Field label="YouTube Video URL">
              <TextInput value={settings.youtubeVideoUrl} onChange={(e) => set("youtubeVideoUrl", e.target.value)} />
            </Field>
            <Field label="Custom Thumbnail URL (optional)">
              <TextInput
                className="sm:col-span-2"
                value={settings.youtubeThumbnailUrl}
                onChange={(e) => set("youtubeThumbnailUrl", e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <p className="mb-4 font-bold text-white">🎁 Free Video Button</p>
          <Field label="Free Video Link (YouTube URL or external link)">
            <TextInput value={settings.freeVideoLink} onChange={(e) => set("freeVideoLink", e.target.value)} />
          </Field>
        </Card>

        <Card>
          <p className="mb-4 font-bold text-white">🔗 Social & Contact Links</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="WhatsApp Number (digits only, with country code)">
              <TextInput value={settings.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} />
            </Field>
            <Field label="WhatsApp Link">
              <TextInput value={settings.whatsappLink} onChange={(e) => set("whatsappLink", e.target.value)} />
            </Field>
            <Field label="Messenger Link">
              <TextInput value={settings.messengerLink} onChange={(e) => set("messengerLink", e.target.value)} />
            </Field>
            <Field label="Facebook Page Link">
              <TextInput value={settings.facebookLink} onChange={(e) => set("facebookLink", e.target.value)} />
            </Field>
            <Field label="Telegram Link (future)">
              <TextInput value={settings.telegramLink} onChange={(e) => set("telegramLink", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <p className="mb-4 font-bold text-white">💳 Payment Settings</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="bKash Number">
              <TextInput value={settings.bkashNumber} onChange={(e) => set("bkashNumber", e.target.value)} />
            </Field>
            <Field label="Nagad Number">
              <TextInput value={settings.nagadNumber} onChange={(e) => set("nagadNumber", e.target.value)} />
            </Field>
            <Field label="Rocket Number">
              <TextInput value={settings.rocketNumber} onChange={(e) => set("rocketNumber", e.target.value)} />
            </Field>
            <Field label="QR Code Image URL">
              <TextInput value={settings.qrCodeUrl} onChange={(e) => set("qrCodeUrl", e.target.value)} />
            </Field>
            <Field label="Or Upload QR Code">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && uploadQr(e.target.files[0])}
                className="text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-white"
              />
            </Field>
            {settings.qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.qrCodeUrl} alt="QR preview" className="h-24 w-24 rounded-lg object-cover" />
            ) : null}
            <Field label="Payment Notice">
              <TextArea
                rows={2}
                className="sm:col-span-2"
                value={settings.paymentNotice}
                onChange={(e) => set("paymentNotice", e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <p className="mb-4 font-bold text-white">🔐 Admin Password</p>
          <Field label="New Password (leave blank to keep current)">
            <TextInput
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter a new password"
            />
          </Field>
        </Card>

        <div className="flex items-center gap-4">
          <Button onClick={save} disabled={saving || uploading}>
            {saving ? "Saving..." : "💾 Save All Settings"}
          </Button>
          {savedMsg ? <p className="text-sm font-semibold text-emerald-400">{savedMsg}</p> : null}
        </div>
      </div>
    </div>
  );
}
