"use client";

import { useMemo, useState } from "react";
import { formatDateTime, taka } from "@/lib/format";
import {
  AdminScreen,
  apiSend,
  Button,
  EmptyState,
  Field,
  ImageField,
  Loading,
  Notice,
  Select,
  TextArea,
  TextInput,
  Toggle,
  useApi,
} from "@/components/admin/ui";

// ---------------------------------------------------------------------------
// Generic field renderer (shared by collections and settings)
// ---------------------------------------------------------------------------
export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "toggle" | "select" | "image" | "datetime" | "json";
  options?: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
};

type Row = Record<string, unknown>;

function toInputValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 16);
    return value;
  }
  return String(value);
}

export function FieldRenderer({
  field,
  row,
  onChange,
}: {
  field: FieldDef;
  row: Row;
  onChange: (key: string, value: unknown) => void;
}) {
  const value = row[field.key];

  if (field.type === "toggle") {
    return (
      <Toggle
        label={field.label}
        checked={value === true || value === "true"}
        onChange={(next) => onChange(field.key, next)}
      />
    );
  }

  if (field.type === "image") {
    return (
      <ImageField
        label={field.label}
        value={String(value ?? "")}
        onChange={(url) => onChange(field.key, url)}
        hint={field.hint}
      />
    );
  }

  if (field.type === "select") {
    return (
      <Field label={field.label} hint={field.hint}>
        <Select value={String(value ?? "")} onChange={(event) => onChange(field.key, event.target.value)}>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  if (field.type === "textarea") {
    return (
      <Field label={field.label} hint={field.hint}>
        <TextArea
          rows={3}
          value={toInputValue(value)}
          placeholder={field.placeholder}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      </Field>
    );
  }

  if (field.type === "json") {
    return (
      <Field label={field.label} hint={field.hint}>
        <TextArea
          rows={6}
          className="font-mono text-[11px]"
          value={typeof value === "string" ? value : JSON.stringify(value ?? [], null, 2)}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      </Field>
    );
  }

  return (
    <Field label={field.label} hint={field.hint}>
      <TextInput
        type={field.type === "datetime" ? "datetime-local" : field.type === "number" ? "number" : "text"}
        value={toInputValue(value)}
        placeholder={field.placeholder}
        onChange={(event) =>
          onChange(
            field.key,
            field.type === "number" ? Number(event.target.value) : event.target.value,
          )
        }
      />
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Collection definitions
// ---------------------------------------------------------------------------
type CollectionConfig = {
  id: string;
  title: string;
  subtitle: string;
  endpoint: string;
  /** key of the array in the API response (defaults to `id`) */
  responseKey?: string;
  empty: Row;
  fields: FieldDef[];
  listTitle: (row: Row) => string;
  listSubtitle?: (row: Row) => string;
  badgeText?: (row: Row) => string | null;
};

const visibleField: FieldDef = { key: "visible", label: "Visible on site", type: "toggle" };
const sortField: FieldDef = { key: "sortOrder", label: "Display order", type: "number", hint: "Lower numbers show first" };

export const COLLECTIONS: Record<string, CollectionConfig> = {
  coupons: {
    id: "coupons",
    title: "Coupons",
    subtitle: "Discount codes with limits and expiry",
    endpoint: "/api/coupons",
    empty: { code: "", discountType: "percent", discountValue: 10, minOrder: 0, usageLimit: "", expiresAt: "", active: true },
    fields: [
      { key: "code", label: "Coupon code", type: "text", placeholder: "SAVE10" },
      {
        key: "discountType",
        label: "Discount type",
        type: "select",
        options: [
          { value: "percent", label: "Percentage (%)" },
          { value: "fixed", label: "Fixed amount (৳)" },
        ],
      },
      { key: "discountValue", label: "Discount value", type: "number" },
      { key: "minOrder", label: "Minimum order (৳)", type: "number", hint: "0 = no minimum" },
      { key: "usageLimit", label: "Usage limit", type: "text", hint: "Leave empty for unlimited" },
      { key: "expiresAt", label: "Expiry date", type: "datetime" },
      { key: "active", label: "Active", type: "toggle" },
    ],
    listTitle: (row) => String(row.code ?? ""),
    listSubtitle: (row) =>
      `${row.discountType === "fixed" ? taka(Number(row.discountValue)) : `${row.discountValue}%`} off · used ${row.usedCount ?? 0}${row.usageLimit ? `/${row.usageLimit}` : ""}`,
    badgeText: (row) => (row.active ? "Active" : "Inactive"),
  },
  banners: {
    id: "banners",
    title: "Banners",
    subtitle: "Offer banners shown on the homepage",
    endpoint: "/api/banners",
    empty: {
      title: "",
      description: "",
      imageUrl: "",
      buttonText: "Order Now",
      buttonUrl: "",
      link: "",
      type: "banner",
      visible: true,
      sortOrder: 0,
    },
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "imageUrl", label: "Banner image", type: "image", hint: "Optional — a gradient is used if empty" },
      { key: "buttonText", label: "Button text", type: "text" },
      { key: "buttonUrl", label: "Button link", type: "text", hint: "https://… or /checkout/1" },
      { key: "link", label: "Whole banner link (optional)", type: "text" },
      {
        key: "type",
        label: "Type",
        type: "select",
        options: [
          { value: "banner", label: "Banner" },
          { value: "offer", label: "Offer (red tag)" },
        ],
      },
      visibleField,
      sortField,
    ],
    listTitle: (row) => String(row.title || "Untitled banner"),
    listSubtitle: (row) => String(row.description ?? ""),
    badgeText: (row) => (row.visible ? "Visible" : "Hidden"),
  },
  notices: {
    id: "notices",
    title: "Notice Board",
    subtitle: "Scrolling notices above the header",
    endpoint: "/api/notices",
    empty: { text: "", visible: true, sortOrder: 0 },
    fields: [{ key: "text", label: "Notice text", type: "textarea" }, visibleField, sortField],
    listTitle: (row) => String(row.text ?? ""),
    badgeText: (row) => (row.visible ? "Visible" : "Hidden"),
  },
  testimonials: {
    id: "testimonials",
    title: "Testimonials",
    subtitle: "Curated customer quotes",
    endpoint: "/api/testimonials",
    empty: { name: "", avatarUrl: "", message: "", rating: 5, visible: true, sortOrder: 0 },
    fields: [
      { key: "name", label: "Client name", type: "text" },
      { key: "message", label: "Message", type: "textarea" },
      { key: "rating", label: "Rating (1–5)", type: "number" },
      { key: "avatarUrl", label: "Photo", type: "image", hint: "Optional" },
      visibleField,
      sortField,
    ],
    listTitle: (row) => String(row.name ?? ""),
    listSubtitle: (row) => String(row.message ?? ""),
    badgeText: (row) => (row.visible ? "Visible" : "Hidden"),
  },
  "proof-slides": {
    id: "proof-slides",
    title: "Client Proof",
    subtitle: "Screenshot slider below the hero",
    endpoint: "/api/proof-slides",
    responseKey: "proofSlides",
    empty: { imageUrl: "", caption: "", visible: true, sortOrder: 0 },
    fields: [
      { key: "imageUrl", label: "Screenshot", type: "image" },
      { key: "caption", label: "Caption (optional)", type: "text" },
      visibleField,
      sortField,
    ],
    listTitle: (row) => String(row.caption || "Screenshot"),
    badgeText: (row) => (row.visible ? "Visible" : "Hidden"),
  },
  gallery: {
    id: "gallery",
    title: "Gallery",
    subtitle: "Portfolio images",
    endpoint: "/api/gallery",
    empty: { imageUrl: "", caption: "", visible: true, sortOrder: 0 },
    fields: [
      { key: "imageUrl", label: "Image", type: "image" },
      { key: "caption", label: "Caption", type: "text" },
      visibleField,
      sortField,
    ],
    listTitle: (row) => String(row.caption || "Gallery image"),
    badgeText: (row) => (row.visible ? "Visible" : "Hidden"),
  },
  "free-video": {
    id: "free-video",
    title: "Free Videos",
    subtitle: "Cards on the /free page",
    endpoint: "/api/free-video-cards",
    responseKey: "freeVideoCards",
    empty: { title: "", thumbnailUrl: "", link: "", visible: true, sortOrder: 0 },
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "thumbnailUrl", label: "Thumbnail", type: "image" },
      { key: "link", label: "Video link", type: "text", hint: "YouTube or Drive link" },
      visibleField,
      sortField,
    ],
    listTitle: (row) => String(row.title ?? ""),
    listSubtitle: (row) => String(row.link ?? ""),
    badgeText: (row) => (row.visible ? "Visible" : "Hidden"),
  },
  faqs: {
    id: "faqs",
    title: "FAQ",
    subtitle: "Questions shown on the homepage",
    endpoint: "/api/faqs",
    empty: { question: "", answer: "", visible: true, sortOrder: 0 },
    fields: [
      { key: "question", label: "Question", type: "text" },
      { key: "answer", label: "Answer", type: "textarea" },
      visibleField,
      sortField,
    ],
    listTitle: (row) => String(row.question ?? ""),
    listSubtitle: (row) => String(row.answer ?? ""),
    badgeText: (row) => (row.visible ? "Visible" : "Hidden"),
  },
  sections: {
    id: "sections",
    title: "Custom Sections",
    subtitle: "Extra homepage sections with items",
    endpoint: "/api/sections",
    empty: { title: "", subtitle: "", videoUrl: "", items: [], visible: true, sortOrder: 0 },
    fields: [
      { key: "title", label: "Section title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "videoUrl", label: "Autoplay video URL (YouTube)", type: "text" },
      {
        key: "items",
        label: "Items (JSON array)",
        type: "json",
        hint: 'Example: [{"title":"Logo Design","description":"…","price":"৳999","imageUrl":"…","link":"…","buttonText":"Order"}]',
      },
      visibleField,
      sortField,
    ],
    listTitle: (row) => String(row.title ?? ""),
    listSubtitle: (row) =>
      Array.isArray(row.items) ? `${(row.items as unknown[]).length} items` : "0 items",
    badgeText: (row) => (row.visible ? "Visible" : "Hidden"),
  },
};

// ---------------------------------------------------------------------------
// Generic collection panel
// ---------------------------------------------------------------------------
export function CollectionPanel({
  config,
  activeScreen,
}: {
  config: CollectionConfig;
  activeScreen: number;
}) {
  const { data, loading, error, reload } = useApi<Record<string, Row[]>>(config.endpoint);
  const [form, setForm] = useState<Row>({ ...config.empty });
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const rows = useMemo(
    () => (data?.[config.responseKey ?? config.id] as Row[] | undefined) ?? [],
    [data, config],
  );
  const editingId = typeof form.id === "number" ? form.id : null;

  function startEdit(row: Row) {
    const next: Row = { ...config.empty };
    for (const field of config.fields) {
      const value = row[field.key];
      next[field.key] =
        field.type === "json" && value !== undefined && typeof value !== "string"
          ? JSON.stringify(value, null, 2)
          : value;
    }
    next.id = row.id;
    setForm(next);
    setNotice("");
  }

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const payload: Row = {};
      for (const field of config.fields) {
        let value = form[field.key];
        if (field.type === "json") {
          try {
            value = typeof value === "string" ? JSON.parse(value || "[]") : value ?? [];
          } catch {
            setNotice("Items must be valid JSON.");
            return;
          }
        }
        if (field.type === "number") value = Number(value ?? 0);
        if (field.type === "datetime") value = value ? new Date(String(value)).toISOString() : null;
        payload[field.key] = value;
      }

      const result = editingId
        ? await apiSend(`${config.endpoint}/${editingId}`, "PATCH", payload)
        : await apiSend(config.endpoint, "POST", payload);

      if (!result.ok) {
        setNotice(String(result.data.error ?? "Could not save. Please check the fields."));
        return;
      }
      setNotice(editingId ? "Saved" : "Created");
      setForm({ ...config.empty });
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this item?")) return;
    const result = await apiSend(`${config.endpoint}/${id}`, "DELETE");
    if (result.ok) {
      setNotice("Deleted");
      setForm({ ...config.empty });
      reload();
    }
  }

  const previewImage = String(form.imageUrl ?? form.thumbnailUrl ?? "");

  return (
    <>
      <AdminScreen
        label="Screen 1 · Info"
        title={config.title}
        subtitle={config.subtitle}
        active={activeScreen === 0}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-line bg-white/5 p-3">
            <p className="text-lg font-extrabold text-warm">{rows.length}</p>
            <p className="text-[11px] text-muted">Total items</p>
          </div>
          <div className="rounded-2xl border border-ok bg-ok-soft p-3">
            <p className="text-lg font-extrabold text-ok">
              {rows.filter((row) => row.visible !== false).length}
            </p>
            <p className="text-[11px] text-ok">Visible on site</p>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Use the list screen to edit an item, or the editor screen to add a new one. Changes appear
          on the website instantly.
        </p>

        <Button
          variant="gold"
          className="mt-3 w-full"
          onClick={() => {
            setForm({ ...config.empty });
            setNotice("");
          }}
        >
          ➕ Add new
        </Button>
      </AdminScreen>

      <AdminScreen
        label="Screen 2 · List"
        title={config.title}
        subtitle={`${rows.length} items`}
        active={activeScreen === 1}
        action={
          <Button variant="ghost" className="px-3 py-1.5 text-[11px]" onClick={reload}>
            Refresh
          </Button>
        }
      >
        {loading ? <Loading /> : null}
        <Notice kind="error" text={error} />
        <Notice kind="ok" text={notice} />
        <div className="flex flex-col gap-2">
          {rows.map((row) => {
            const badge = config.badgeText?.(row);
            return (
              <button
                key={String(row.id)}
                type="button"
                onClick={() => startEdit(row)}
                className={`row-tap ${editingId === row.id ? "border-gold ring-1 ring-gold-line" : ""}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 block text-[13px] font-bold text-warm">
                    {config.listTitle(row)}
                  </span>
                  {config.listSubtitle ? (
                    <span className="line-clamp-1 mt-0.5 block text-[11px] text-muted">
                      {config.listSubtitle(row)}
                    </span>
                  ) : null}
                </span>
                {badge ? <span className="badge-neutral">{badge}</span> : null}
              </button>
            );
          })}
          {!loading && rows.length === 0 ? (
            <EmptyState text="Nothing here yet — add your first item." />
          ) : null}
        </div>
      </AdminScreen>

      <AdminScreen
        label="Screen 3 · Editor"
        title={editingId ? "Edit item" : "Add new"}
        subtitle={editingId ? `#${editingId}` : config.title}
        active={activeScreen === 2}
      >
        {previewImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewImage}
            alt=""
            className="mb-3 h-28 w-full rounded-2xl border border-line object-cover"
          />
        ) : null}

        <div className="flex flex-col gap-3">
          {config.fields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              row={form}
              onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
            />
          ))}

          {editingId ? (
            <p className="text-[11px] text-muted-2">
              Created {formatDateTime(String(form.createdAt ?? ""))}
            </p>
          ) : null}

          <Notice kind="ok" text={notice} />

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editingId ? "💾 Save changes" : "➕ Create"}
            </Button>
            <Button variant="outline" onClick={() => setForm({ ...config.empty })}>
              Clear
            </Button>
          </div>

          {editingId ? (
            <Button variant="danger" onClick={() => remove(editingId)}>
              Delete
            </Button>
          ) : null}
        </div>
      </AdminScreen>
    </>
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
const SETTINGS_GROUPS: { id: string; label: string; icon: string; fields: FieldDef[] }[] = [
  {
    id: "brand",
    label: "Brand",
    icon: "🏷️",
    fields: [
      { key: "siteName", label: "Website name", type: "text" },
      { key: "logoText", label: "Logo text", type: "text" },
      { key: "logoUrl", label: "Logo image", type: "image" },
    ],
  },
  {
    id: "hero",
    label: "Hero section",
    icon: "✨",
    fields: [
      { key: "heroBadgeText", label: "Top badge text", type: "text" },
      { key: "heroTitle", label: "Main headline", type: "textarea" },
      { key: "heroSubtitle", label: "Sub headline", type: "textarea" },
    ],
  },
  {
    id: "stats",
    label: "Statistics",
    icon: "📈",
    fields: [
      { key: "statHappyClients", label: "Happy clients", type: "text" },
      { key: "statCompletedOrders", label: "Completed orders", type: "text" },
      { key: "statSeoOptimized", label: "SEO optimized", type: "text" },
    ],
  },
  {
    id: "contact",
    label: "Contact & social",
    icon: "🔗",
    fields: [
      { key: "whatsappNumber", label: "WhatsApp number", type: "text", hint: "8801XXXXXXXXX (digits with country code)" },
      { key: "whatsappLink", label: "WhatsApp link", type: "text", hint: "Leave empty to build it automatically" },
      { key: "messengerLink", label: "Messenger link", type: "text" },
      { key: "facebookLink", label: "Facebook page", type: "text" },
      { key: "telegramLink", label: "Telegram link", type: "text" },
    ],
  },
  {
    id: "payment",
    label: "Payments",
    icon: "💳",
    fields: [
      { key: "bkashNumber", label: "bKash number", type: "text" },
      { key: "nagadNumber", label: "Nagad number", type: "text" },
      { key: "rocketNumber", label: "Rocket number", type: "text", hint: "Leave empty to hide Rocket" },
      { key: "qrCodeUrl", label: "QR code image", type: "image" },
      { key: "paymentNotice", label: "Payment instructions", type: "textarea" },
    ],
  },
  {
    id: "videos",
    label: "Videos & offer",
    icon: "🎬",
    fields: [
      { key: "youtubeVideoUrl", label: "Homepage featured video URL", type: "text" },
      { key: "youtubeTitle", label: "Featured video title", type: "text" },
      { key: "youtubeDescription", label: "Featured video description", type: "textarea" },
      { key: "youtubeThumbnailUrl", label: "Custom thumbnail", type: "image", hint: "Optional — YouTube thumbnail is used by default" },
      { key: "boomVideoUrl", label: "Boom Shorts section video", type: "text" },
      { key: "serviceVideoUrl", label: "Services section video", type: "text" },
      { key: "demoVideoUrl", label: "Demo page video", type: "text" },
      { key: "freeVideoLink", label: "Free videos link", type: "text" },
      { key: "offerEnabled", label: "Show countdown offer", type: "toggle" },
      { key: "offerText", label: "Offer text", type: "text" },
      { key: "offerEndsAt", label: "Offer ends at", type: "datetime" },
    ],
  },
  {
    id: "security",
    label: "Admin password",
    icon: "🔐",
    fields: [
      { key: "newPassword", label: "New password", type: "text", hint: "Leave empty to keep the current password" },
    ],
  },
];

export function SettingsPanel({ activeScreen }: { activeScreen: number }) {
  const { data, loading, error, reload } = useApi<{ settings: Row }>("/api/settings?full=1");
  const [draft, setDraft] = useState<Row | null>(null);
  const [group, setGroup] = useState(SETTINGS_GROUPS[0].id);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const values = draft ?? data?.settings ?? {};
  const activeGroup = SETTINGS_GROUPS.find((item) => item.id === group) ?? SETTINGS_GROUPS[0];

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const payload: Row = {};
      for (const settingsGroup of SETTINGS_GROUPS) {
        for (const field of settingsGroup.fields) {
          if (field.key === "newPassword") continue;
          if (field.key in values) payload[field.key] = values[field.key];
        }
      }
      const newPassword = String(values.newPassword ?? "").trim();
      if (newPassword) payload.newPassword = newPassword;

      const result = await apiSend("/api/settings", "PATCH", payload);
      if (!result.ok) {
        setNotice(String(result.data.error ?? "Could not save settings"));
        return;
      }
      setNotice("Settings saved — the website is updated.");
      setDraft(null);
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminScreen
        label="Screen 1 · Settings"
        title="Settings"
        subtitle="Site-wide configuration"
        active={activeScreen === 0}
      >
        {loading ? <Loading /> : null}
        <Notice kind="error" text={error} />
        <div className="flex flex-col gap-2">
          {SETTINGS_GROUPS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setGroup(item.id)}
              className={`row-tap ${group === item.id ? "border-gold ring-1 ring-gold-line" : ""}`}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/5">
                {item.icon}
              </span>
              <span className="flex-1 text-[13px] font-bold text-warm">{item.label}</span>
              <span className="text-muted-2">›</span>
            </button>
          ))}
        </div>
      </AdminScreen>

      <AdminScreen
        label="Screen 2 · Groups"
        title="Configuration"
        subtitle="Pick a group to edit"
        active={activeScreen === 1}
      >
        <p className="text-[11px] leading-relaxed text-muted">
          Everything here is stored in your existing settings table. Changes apply immediately —
          no redeploy needed.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {SETTINGS_GROUPS.map((item) => (
            <div key={item.id} className="rounded-2xl border border-line p-3">
              <p className="text-[13px] font-bold text-warm">
                {item.icon} {item.label}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-2">
                {item.fields.length} setting{item.fields.length === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      </AdminScreen>

      <AdminScreen
        label="Screen 3 · Edit"
        title={activeGroup.label}
        subtitle="Edit and save"
        active={activeScreen === 2}
        action={
          <Button variant="ghost" className="px-3 py-1.5 text-[11px]" onClick={() => setGroup(SETTINGS_GROUPS[0].id)}>
            First group
          </Button>
        }
      >
        <div className="mb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {SETTINGS_GROUPS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setGroup(item.id)}
              className={`chip ${group === item.id ? "chip-active" : ""}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {activeGroup.fields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              row={values}
              onChange={(key, value) =>
                setDraft((current) => ({ ...(current ?? values), [key]: value }))
              }
            />
          ))}

          <Notice kind="ok" text={notice} />
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "💾 Save all settings"}
          </Button>
        </div>
      </AdminScreen>
    </>
  );
}

// ---------------------------------------------------------------------------
// Product videos (featured + section videos + package demos)
// ---------------------------------------------------------------------------
export function VideosPanel({ activeScreen }: { activeScreen: number }) {
  const { data, loading, error, reload } = useApi<{ settings: Row }>("/api/settings?full=1");
  const packagesApi = useApi<{ packages: { id: number; name: string; demoVideoUrl: string; category: string }[] }>(
    "/api/packages",
  );

  const [draft, setDraft] = useState<Row | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [slot, setSlot] = useState("youtube");

  const values = draft ?? data?.settings ?? {};
  const packages = packagesApi.data?.packages ?? [];

  const SLOTS: { id: string; label: string; fields: FieldDef[] }[] = [
    {
      id: "youtube",
      label: "Homepage featured",
      fields: [
        { key: "youtubeVideoUrl", label: "YouTube URL", type: "text", placeholder: "https://youtu.be/…" },
        { key: "youtubeTitle", label: "Video title", type: "text" },
        { key: "youtubeDescription", label: "Description", type: "textarea" },
        { key: "youtubeThumbnailUrl", label: "Custom thumbnail", type: "image" },
      ],
    },
    {
      id: "sections",
      label: "Package section videos",
      fields: [
        { key: "boomVideoUrl", label: "Boom Shorts section video", type: "text" },
        { key: "boomVideoThumbnailUrl", label: "Boom Shorts thumbnail", type: "image" },
        { key: "serviceVideoUrl", label: "Services section video", type: "text" },
        { key: "serviceVideoThumbnailUrl", label: "Services thumbnail", type: "image" },
      ],
    },
    {
      id: "demo",
      label: "Demo & free",
      fields: [
        { key: "demoVideoUrl", label: "Demo page video", type: "text" },
        { key: "freeVideoLink", label: "Free videos link", type: "text" },
      ],
    },
  ];

  const activeSlot = SLOTS.find((item) => item.id === slot) ?? SLOTS[0];

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const payload: Row = {};
      for (const item of SLOTS) {
        for (const field of item.fields) if (field.key in values) payload[field.key] = values[field.key];
      }
      const result = await apiSend("/api/settings", "PATCH", payload);
      if (!result.ok) {
        setNotice(String(result.data.error ?? "Could not save the video settings"));
        return;
      }
      setNotice("Video settings saved");
      setDraft(null);
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminScreen
        label="Screen 1 · Videos"
        title="Product Videos"
        subtitle="YouTube links used on the site"
        active={activeScreen === 0}
      >
        {loading ? <Loading /> : null}
        <Notice kind="error" text={error} />
        <div className="grid grid-cols-2 gap-2.5">
          <div className={`rounded-2xl border p-3 ${values.youtubeVideoUrl ? "border-ok bg-ok-soft" : "border-line bg-white/5"}`}>
            <p className="text-[11px] font-bold text-muted">Featured video</p>
            <p className="mt-1 text-[12px] font-bold text-warm">
              {values.youtubeVideoUrl ? "Configured ✓" : "Not set"}
            </p>
          </div>
          <div className={`rounded-2xl border p-3 ${values.demoVideoUrl ? "border-ok bg-ok-soft" : "border-line bg-white/5"}`}>
            <p className="text-[11px] font-bold text-muted">Demo video</p>
            <p className="mt-1 text-[12px] font-bold text-warm">
              {values.demoVideoUrl ? "Configured ✓" : "Not set"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Invalid or empty URLs are ignored on the website — the section simply hides instead of
          breaking the page. Package demo videos are edited inside each package.
        </p>
      </AdminScreen>

      <AdminScreen
        label="Screen 2 · Slots"
        title="Video slots"
        subtitle="Homepage, sections, demo"
        active={activeScreen === 1}
      >
        <div className="flex flex-col gap-2">
          {SLOTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSlot(item.id)}
              className={`row-tap ${slot === item.id ? "border-gold ring-1 ring-gold-line" : ""}`}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/5">🎬</span>
              <span className="flex-1 text-[13px] font-bold text-warm">{item.label}</span>
              <span className="text-muted-2">›</span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-2">
          Package demo videos
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-2xl border border-line p-3">
              <p className="text-[12px] font-bold text-warm">{pkg.name}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-2">
                {pkg.demoVideoUrl || "no demo video"}
              </p>
            </div>
          ))}
          {packages.length === 0 ? <EmptyState text="No packages yet." /> : null}
        </div>
      </AdminScreen>

      <AdminScreen
        label="Screen 3 · Edit"
        title={activeSlot.label}
        subtitle="Paste a YouTube or Drive link"
        active={activeScreen === 2}
      >
        <div className="flex flex-col gap-3">
          {activeSlot.fields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              row={values}
              onChange={(key, value) => setDraft((current) => ({ ...(current ?? values), [key]: value }))}
            />
          ))}
          <Notice kind="ok" text={notice} />
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "💾 Save videos"}
          </Button>
          <p className="text-[11px] text-muted-2">
            Tip: use https://youtu.be/VIDEO_ID or the full watch URL — both work.
          </p>
        </div>
      </AdminScreen>
    </>
  );
}
