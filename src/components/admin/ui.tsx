"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

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
          checked ? "bg-ok" : "bg-slate-200"
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

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-gold-soft text-gold-light",
  payment_verified: "bg-gold-soft text-gold-light",
  processing: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-ok",
  cancelled: "bg-white/10 text-warm-dim",
  rejected: "bg-red-100 text-bad",
  verified: "bg-emerald-100 text-ok",
  approved: "bg-emerald-100 text-ok",
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
  return (
    <span className="text-gold" aria-label={`${value} of 5`}>
      {"★".repeat(Math.max(0, Math.min(5, value)))}
    </span>
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
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-dashed border-slate-300 text-muted-2">
            🖼
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
