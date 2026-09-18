"use client";

import { useMemo, useState } from "react";
import { computePackagePricing } from "@/lib/pricing";
import { taka } from "@/lib/format";
import {
  AdminScreen,
  apiSend,
  Button,
  EmptyState,
  Field,
  Loading,
  Notice,
  Select,
  TextArea,
  TextInput,
  Toggle,
  useApi,
} from "@/components/admin/ui";

type Pkg = {
  id: number;
  category: string;
  name: string;
  description: string;
  oldPrice: string | null;
  newPrice: string;
  discountType: string;
  discountValue: string;
  badge: string;
  bestSeller: boolean;
  buttonText: string;
  icon: string;
  quantityLabel: string;
  features: unknown;
  demoVideoUrl: string;
  available: boolean;
  visible: boolean;
  showOnHome: boolean;
  recentlyAdded: boolean;
  sortOrder: number;
};

type FormState = {
  id: number | null;
  category: "boom" | "service";
  name: string;
  description: string;
  icon: string;
  quantityLabel: string;
  featuresText: string;
  demoVideoUrl: string;
  oldPrice: string;
  discountType: "none" | "percent" | "fixed";
  discountValue: string;
  buttonText: string;
  badge: "none" | "popular" | "bestseller" | "new";
  bestSeller: boolean;
  available: boolean;
  visible: boolean;
  showOnHome: boolean;
  recentlyAdded: boolean;
  sortOrder: string;
};

const emptyForm: FormState = {
  id: null,
  category: "boom",
  name: "",
  description: "",
  icon: "🎬",
  quantityLabel: "",
  featuresText: "",
  demoVideoUrl: "",
  oldPrice: "",
  discountType: "none",
  discountValue: "0",
  buttonText: "Order Now",
  badge: "none",
  bestSeller: false,
  available: true,
  visible: true,
  showOnHome: true,
  recentlyAdded: false,
  sortOrder: "0",
};

function toFeatures(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

export function PackagesPanel({ activeScreen }: { activeScreen: number }) {
  const { data, loading, error, reload } = useApi<{ packages: Pkg[] }>("/api/packages");
  const [tab, setTab] = useState<"boom" | "service">("boom");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const all = useMemo(() => data?.packages ?? [], [data]);
  const rows = useMemo(
    () => all.filter((pkg) => pkg.category === tab).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    [all, tab],
  );

  const preview = computePackagePricing({
    oldPrice: form.oldPrice,
    newPrice: form.oldPrice || "0",
    discountType: form.discountType,
    discountValue: form.discountValue,
  });

  function startEdit(pkg: Pkg) {
    setForm({
      id: pkg.id,
      category: pkg.category === "service" ? "service" : "boom",
      name: pkg.name,
      description: pkg.description,
      icon: pkg.icon,
      quantityLabel: pkg.quantityLabel,
      featuresText: toFeatures(pkg.features).join("\n"),
      demoVideoUrl: pkg.demoVideoUrl,
      oldPrice: pkg.oldPrice ?? "",
      discountType: (pkg.discountType as FormState["discountType"]) || "none",
      discountValue: pkg.discountValue === "0.00" ? "0" : pkg.discountValue,
      buttonText: pkg.buttonText,
      badge: (pkg.badge as FormState["badge"]) || "none",
      bestSeller: pkg.bestSeller,
      available: pkg.available,
      visible: pkg.visible,
      showOnHome: pkg.showOnHome,
      recentlyAdded: pkg.recentlyAdded,
      sortOrder: String(pkg.sortOrder),
    });
    setNotice("");
  }

  async function save() {
    if (!form.name.trim()) {
      setNotice("Package name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        category: form.category,
        name: form.name,
        description: form.description,
        icon: form.icon,
        quantityLabel: form.quantityLabel,
        features: form.featuresText,
        demoVideoUrl: form.demoVideoUrl,
        // The final price is derived from original price + discount (never typed twice)
        oldPrice: form.oldPrice === "" ? null : Number(form.oldPrice),
        newPrice: form.oldPrice === "" ? Number(form.discountValue || 0) : Number(form.oldPrice),
        discountType: form.oldPrice === "" ? "none" : form.discountType,
        discountValue: form.oldPrice === "" ? 0 : Number(form.discountValue || 0),
        buttonText: form.buttonText,
        badge: form.bestSeller ? "bestseller" : form.badge,
        bestSeller: form.bestSeller,
        available: form.available,
        visible: form.visible,
        showOnHome: form.showOnHome,
        recentlyAdded: form.recentlyAdded,
        sortOrder: Number(form.sortOrder || 0),
      };

      const result = form.id
        ? await apiSend(`/api/packages/${form.id}`, "PATCH", payload)
        : await apiSend("/api/packages", "POST", payload);

      if (!result.ok) {
        setNotice(String(result.data.error ?? "Could not save the package"));
        return;
      }
      setNotice(form.id ? "Package updated" : "Package created");
      setForm({ ...emptyForm, category: form.category });
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function quickPatch(pkg: Pkg, patch: Record<string, unknown>, message: string) {
    const result = await apiSend(`/api/packages/${pkg.id}`, "PATCH", patch);
    setNotice(result.ok ? message : String(result.data.error ?? "Update failed"));
    reload();
  }

  async function move(pkg: Pkg, direction: -1 | 1) {
    await quickPatch(pkg, { sortOrder: pkg.sortOrder + direction }, "Order updated");
  }

  async function remove(pkg: Pkg) {
    if (!window.confirm(`Delete "${pkg.name}"?`)) return;
    const result = await apiSend(`/api/packages/${pkg.id}`, "DELETE");
    if (result.ok) {
      setNotice("Package deleted");
      setForm(emptyForm);
      reload();
    }
  }

  return (
    <>
      <AdminScreen
        label="Screen 1 · Catalog"
        title="Packages"
        subtitle="Prices, visibility and order"
        active={activeScreen === 0}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-line bg-white/5 p-3">
            <p className="text-lg font-extrabold text-warm">
              {all.filter((pkg) => pkg.category === "boom").length}
            </p>
            <p className="text-[11px] text-muted">Boom Shorts packages</p>
          </div>
          <div className="rounded-2xl border border-line bg-white/5 p-3">
            <p className="text-lg font-extrabold text-warm">
              {all.filter((pkg) => pkg.category === "service").length}
            </p>
            <p className="text-[11px] text-muted">Service packages</p>
          </div>
          <div className="rounded-2xl border border-ok bg-ok-soft p-3">
            <p className="text-lg font-extrabold text-ok">
              {all.filter((pkg) => pkg.available).length}
            </p>
            <p className="text-[11px] text-ok">Available now</p>
          </div>
          <div className="rounded-2xl border border-gold-line bg-gold-soft p-3">
            <p className="text-lg font-extrabold text-gold-light">
              {all.filter((pkg) => pkg.bestSeller).length}
            </p>
            <p className="text-[11px] text-gold-light">Best sellers</p>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            variant={tab === "boom" ? "primary" : "outline"}
            className="flex-1 py-2 text-[12px]"
            onClick={() => setTab("boom")}
          >
            Boom Shorts
          </Button>
          <Button
            variant={tab === "service" ? "primary" : "outline"}
            className="flex-1 py-2 text-[12px]"
            onClick={() => setTab("service")}
          >
            Services
          </Button>
        </div>

        <Button
          variant="gold"
          className="mt-3 w-full"
          onClick={() => setForm({ ...emptyForm, category: tab, sortOrder: String(rows.length) })}
        >
          ➕ Add new package
        </Button>

        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Set the original price and a discount — the final price is calculated automatically so
          numbers can never contradict each other.
        </p>
      </AdminScreen>

      <AdminScreen
        label="Screen 2 · List"
        title={tab === "boom" ? "Boom Shorts packages" : "Service packages"}
        subtitle={`${rows.length} packages`}
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
          {rows.map((pkg) => {
            const pricing = computePackagePricing(pkg);
            return (
              <div
                key={pkg.id}
                className={`rounded-2xl border p-3 ${
                  form.id === pkg.id ? "border-gold ring-1 ring-gold-line" : "border-line"
                }`}
              >
                <button
                  type="button"
                  onClick={() => startEdit(pkg)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-warm">
                        {pkg.icon} {pkg.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {taka(pricing.originalPrice)} → <strong>{taka(pricing.finalPrice)}</strong>
                        {pricing.discountPercent > 0 ? ` (−${pricing.discountPercent}%)` : ""}
                      </p>
                      {pkg.quantityLabel ? (
                        <p className="mt-0.5 text-[10px] text-muted-2">{pkg.quantityLabel}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={pkg.available ? "badge-available" : "badge-unavailable"}>
                        {pkg.available ? "Available" : "Off"}
                      </span>
                      {pkg.bestSeller ? <span className="badge-bestseller">★ Best</span> : null}
                      {!pkg.visible ? <span className="badge-neutral">Hidden</span> : null}
                    </div>
                  </div>
                </button>

                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  <Button
                    variant="ghost"
                    className="px-1 py-1.5 text-[10px]"
                    onClick={() => move(pkg, -1)}
                    title="Move up"
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-1 py-1.5 text-[10px]"
                    onClick={() => move(pkg, 1)}
                    title="Move down"
                  >
                    ↓
                  </Button>
                  <Button
                    variant="outline"
                    className="px-1 py-1.5 text-[10px]"
                    onClick={() =>
                      quickPatch(
                        pkg,
                        { available: !pkg.available },
                        pkg.available ? "Marked unavailable" : "Marked available",
                      )
                    }
                  >
                    {pkg.available ? "Sold out" : "Available"}
                  </Button>
                  <Button
                    variant="outline"
                    className="px-1 py-1.5 text-[10px]"
                    onClick={() =>
                      quickPatch(
                        pkg,
                        { visible: !pkg.visible },
                        pkg.visible ? "Hidden from site" : "Visible on site",
                      )
                    }
                  >
                    {pkg.visible ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
            );
          })}
          {!loading && rows.length === 0 ? (
            <EmptyState
              text="No packages in this category yet."
              action={
                <Button onClick={() => setForm({ ...emptyForm, category: tab })}>Add package</Button>
              }
            />
          ) : null}
        </div>
      </AdminScreen>

      <AdminScreen
        label="Screen 3 · Editor"
        title={form.id ? "Edit package" : "New package"}
        subtitle={form.id ? `#${form.id}` : "Fill in the details"}
        active={activeScreen === 2}
      >
        <div className="flex flex-col gap-3">
          <Field label="Category">
            <Select
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value as FormState["category"],
                }))
              }
            >
              <option value="boom">Boom Shorts</option>
              <option value="service">Other services</option>
            </Select>
          </Field>

          <Field label="Package name">
            <TextInput
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. Starter Pack"
            />
          </Field>

          <Field label="Short description">
            <TextArea
              rows={2}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Icon (emoji)">
              <TextInput
                value={form.icon}
                onChange={(event) =>
                  setForm((current) => ({ ...current, icon: event.target.value }))
                }
              />
            </Field>
            <Field label="Quantity / duration">
              <TextInput
                value={form.quantityLabel}
                onChange={(event) =>
                  setForm((current) => ({ ...current, quantityLabel: event.target.value }))
                }
                placeholder="10 videos / 30 days"
              />
            </Field>
          </div>

          <Field label="Features (one per line)">
            <TextArea
              rows={5}
              value={form.featuresText}
              onChange={(event) =>
                setForm((current) => ({ ...current, featuresText: event.target.value }))
              }
              placeholder={"4K quality\nVoice over included\n24h delivery"}
            />
          </Field>

          <Field label="Demo video URL (YouTube)">
            <TextInput
              value={form.demoVideoUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, demoVideoUrl: event.target.value }))
              }
              placeholder="https://youtu.be/..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Original price (৳)">
              <TextInput
                value={form.oldPrice}
                inputMode="decimal"
                onChange={(event) =>
                  setForm((current) => ({ ...current, oldPrice: event.target.value }))
                }
                placeholder="1000"
              />
            </Field>
            <Field label="Discount type">
              <Select
                value={form.discountType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    discountType: event.target.value as FormState["discountType"],
                  }))
                }
              >
                <option value="none">No discount</option>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed amount (৳)</option>
              </Select>
            </Field>
          </div>

          {form.discountType !== "none" ? (
            <Field
              label={form.discountType === "percent" ? "Discount percent (%)" : "Discount amount (৳)"}
            >
              <TextInput
                value={form.discountValue}
                inputMode="decimal"
                onChange={(event) =>
                  setForm((current) => ({ ...current, discountValue: event.target.value }))
                }
              />
            </Field>
          ) : null}

          <div className="rounded-2xl border border-gold-line bg-gold-soft p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gold-light">
              Final price (calculated)
            </p>
            <p className="mt-1 text-lg font-extrabold text-warm">
              {form.oldPrice === ""
                ? taka(Number(form.discountValue || 0))
                : taka(preview.finalPrice)}
            </p>
            {form.oldPrice !== "" && preview.discountAmount > 0 ? (
              <p className="text-[11px] text-muted">
                <span className="line-through">{taka(preview.originalPrice)}</span> · save{" "}
                {taka(preview.discountAmount)} ({preview.discountPercent}%)
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Button text">
              <TextInput
                value={form.buttonText}
                onChange={(event) =>
                  setForm((current) => ({ ...current, buttonText: event.target.value }))
                }
              />
            </Field>
            <Field label="Badge">
              <Select
                value={form.badge}
                disabled={form.bestSeller}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    badge: event.target.value as FormState["badge"],
                  }))
                }
              >
                <option value="none">None</option>
                <option value="popular">Popular</option>
                <option value="bestseller">Best Seller</option>
                <option value="new">New</option>
              </Select>
            </Field>
          </div>

          <Field label="Display order (lower = first)">
            <TextInput
              value={form.sortOrder}
              inputMode="numeric"
              onChange={(event) =>
                setForm((current) => ({ ...current, sortOrder: event.target.value }))
              }
            />
          </Field>

          <Toggle
            label="Best Seller"
            checked={form.bestSeller}
            onChange={(value) => setForm((current) => ({ ...current, bestSeller: value }))}
          />
          <Toggle
            label="Available for ordering"
            checked={form.available}
            onChange={(value) => setForm((current) => ({ ...current, available: value }))}
          />
          <Toggle
            label="Show on website"
            checked={form.visible}
            onChange={(value) => setForm((current) => ({ ...current, visible: value }))}
          />
          <Toggle
            label="Show on homepage"
            checked={form.showOnHome}
            onChange={(value) => setForm((current) => ({ ...current, showOnHome: value }))}
          />
          <Toggle
            label="Recently added badge"
            checked={form.recentlyAdded}
            onChange={(value) => setForm((current) => ({ ...current, recentlyAdded: value }))}
          />

          <Notice kind="ok" text={notice} />

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : form.id ? "💾 Save changes" : "➕ Create package"}
            </Button>
            <Button variant="outline" onClick={() => setForm({ ...emptyForm, category: tab })}>
              Clear form
            </Button>
          </div>

          {form.id ? (
            <Button variant="danger" onClick={() => remove(rows.find((pkg) => pkg.id === form.id)!)}>
              Delete this package
            </Button>
          ) : null}
        </div>
      </AdminScreen>
    </>
  );
}
