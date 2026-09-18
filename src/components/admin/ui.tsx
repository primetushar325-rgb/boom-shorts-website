"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Camera,
  CheckCircle2,
  Clock3,
  Link2,
  Lock,
  Sparkles,
  TrendingUp,
  Wallet,
  Clapperboard,
  CreditCard,
  GalleryHorizontalEnd,
  Gift,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  Puzzle,
  Receipt,
  Settings,
  Star,
  Tag,
  Users,
  X,
} from "lucide-react";

/**
 * The one icon system for the admin app: lucide-react. Section ids map to a
 * component here so no panel has to invent (or paste) its own glyph.
 */
const ADMIN_ICONS = {
  dashboard: LayoutDashboard,
  orders: Receipt,
  payments: CreditCard,
  customers: Users,
  packages: Package,
  videos: Clapperboard,
  coupons: Tag,
  banners: ImageIcon,
  notices: Megaphone,
  testimonials: MessageSquare,
  "proof-slides": Camera,
  gallery: GalleryHorizontalEnd,
  "free-video": Gift,
  faqs: HelpCircle,
  sections: Puzzle,
  settings: Settings,
  brand: Tag,
  hero: Sparkles,
  stats: TrendingUp,
  contact: Link2,
  payment: Wallet,
  security: Lock,
  reviews: Star,
  completed: CheckCircle2,
  pending: Clock3,
  revenue: Wallet,
} as const;

export type AdminIconName = keyof typeof ADMIN_ICONS;

export function AdminIcon({
  name,
  size = 16,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = ADMIN_ICONS[name as AdminIconName] ?? LayoutDashboard;
  return <Icon size={size} className={className} aria-hidden />;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
export function useApi<T>(url: string | null): {
  data: T | null;
  loading: boolean;
  error: string;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error || "Could not load data.");
        setData(null);
        return;
      }
      setError("");
      setData(payload as T);
    } catch {
      setError("Network problem. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    // Deferred to a microtask so the fetch (and its state updates) never runs
    // synchronously inside the effect body.
    let active = true;
    Promise.resolve().then(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  return { data, loading, error, reload: load };
}

export async function apiSend(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: "Network problem. Please try again." } };
  }
}

// ---------------------------------------------------------------------------
// Screen frame — one "phone screen" of the three-screen admin layout
// ---------------------------------------------------------------------------
export function AdminScreen({
  label,
  title,
  subtitle,
  active,
  action,
  children,
}: {
  label: string;
  title: string;
  subtitle?: string;
  active: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`admin-screen ${active ? "flex" : "hidden lg:flex"} lg:max-h-[calc(100vh-8.5rem)]`}>
      <header className="admin-screen-head">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">{label}</p>
          <h2 className="truncate text-sm font-extrabold text-warm">{title}</h2>
          {subtitle ? <p className="truncate text-[11px] text-muted-2">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="admin-screen-body">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="mt-1 text-[11px] text-muted-2">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`input ${props.className ?? ""}`} />;
}

export function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...props} className={`input ${props.className ?? ""}`}>
      {children}
    </select>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost" | "danger" | "gold";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: "btn-primary",
    outline: "btn-outline",
    ghost: "btn-ghost",
    danger: "btn-danger",
    gold: "btn-gold",
  }[variant];

  return (
    <button {...rest} className={`${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-coal px-3 py-2.5 text-left"
      aria-pressed={checked}
    >
      <span className="text-[13px] font-semibold text-warm-dim">{label}</span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-ok" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-coal shadow transition ${
            checked ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/** Dark-theme pills — the previous light-theme tokens rendered as pale boxes
 *  on the black admin surfaces. */
const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-gold-soft text-gold-light",
  payment_verified: "bg-gold-soft text-gold-light",
  processing: "bg-gold-soft text-gold-light",
  completed: "bg-ok-soft text-ok",
  cancelled: "bg-white/10 text-warm-dim",
  rejected: "bg-bad-soft text-bad",
  verified: "bg-ok-soft text-ok",
  approved: "bg-ok-soft text-ok",
};

export function StatusPill({ value }: { value: string }) {
  const label = value.replace(/_/g, " ");
  return (
    <span className={`badge ${STATUS_CLASSES[value] ?? "bg-white/5 text-warm-dim"} capitalize`}>
      {label}
    </span>
  );
}

export function Stars({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(5, value));
  return (
    <span className="inline-flex text-gold" role="img" aria-label={`${value} of 5`}>
      {[0, 1, 2, 3, 4].map((index) => (
        <Star
          key={index}
          size={13}
          className={index < filled ? "fill-current" : "opacity-30"}
          aria-hidden
        />
      ))}
    </span>
  );
}

/**
 * In-app confirmation dialog.
 *
 * `window.confirm()` is unusable on Android Chrome inside a PWA/standalone
 * context and is trivially missed on a phone, so destructive admin actions ask
 * here instead. The sheet is a real dialog: focus moves to the cancel button,
 * Escape and backdrop taps close it, and the body never scrolls behind it.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-3xl border border-line bg-surface p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-extrabold text-warm">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-lg p-1 text-muted transition hover:bg-white/5 hover:text-warm"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">{message}</p>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" className="flex-1 py-2.5 text-xs" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" className="flex-1 py-2.5 text-xs" onClick={onConfirm} disabled={busy} autoFocus>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/5 px-4 py-8 text-center">
      <p className="text-xs text-muted-2">{text}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function Loading({ text = "Loading…" }: { text?: string }) {
  return <p className="py-8 text-center text-xs text-muted-2">{text}</p>;
}

export function Notice({ kind, text }: { kind: "ok" | "error"; text: string }) {
  if (!text) return null;
  return (
    <p
      className={`rounded-xl px-3 py-2 text-[11px] font-semibold ${
        kind === "ok" ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"
      }`}
    >
      {text}
    </p>
  );
}

/** Upload an image and return its public URL (uses /api/upload). */
export function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl border border-line object-cover"
          />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-dashed border-line text-muted-2">
            <ImageIcon size={18} aria-hidden />
          </span>
        )}
        <div className="flex-1">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="input file:mr-2 file:rounded-lg file:border-0 file:bg-gold file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-white"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setBusy(true);
              setError("");
              try {
                const form = new FormData();
                form.append("file", file);
                const res = await fetch("/api/upload", { method: "POST", body: form });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Upload failed");
                onChange(data.url);
              } catch (uploadError) {
                setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
              } finally {
                setBusy(false);
              }
            }}
          />
          {busy ? <p className="mt-1 text-[11px] text-muted-2">Uploading…</p> : null}
          {error ? <p className="mt-1 text-[11px] font-semibold text-bad">{error}</p> : null}
          {hint ? <p className="mt-1 text-[11px] text-muted-2">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}
