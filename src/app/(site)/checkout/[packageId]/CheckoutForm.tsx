"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { taka } from "@/lib/pricing";

type Method = "bKash" | "Nagad";

const METHODS: { key: Method; label: string; hint: string; active: string }[] = [
  { key: "bKash", label: "bKash", hint: "Send Money", active: "border-[#E2136E] bg-[#FDE7F0] text-[#E2136E]" },
  { key: "Nagad", label: "Nagad", hint: "Send Money", active: "border-[#F6921E] bg-[#FEF0E0] text-[#C26A00]" },
];

export default function CheckoutForm({
  pkg,
  settings,
  uploadToken,
}: {
  uploadToken: string;
  pkg: { id: number; name: string; finalPrice: number; basePrice: number };
  settings: {
    siteName: string;
    whatsappNumber: string;
    bkashNumber: string;
    nagadNumber: string;
    paymentNotice: string;
    qrCodeUrl: string;
  };
}) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("bKash");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; note: string } | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  /** Guards against a double-tapped submit creating two orders. */
  const inFlight = useRef(false);

  const payNumber = method === "bKash" ? settings.bkashNumber : settings.nagadNumber;

  async function applyCoupon() {
    const code = couponCode.trim();
    if (!code || checkingCoupon) return;
    setCheckingCoupon(true);
    setError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, amount: pkg.finalPrice }),
      });
      const data = await res.json();
      if (data.valid) {
        setCoupon({ code: data.code, note: data.note ?? "Coupon applied" });
      } else {
        setCoupon(null);
        setError(data.error || "That coupon code is not valid.");
      }
    } catch {
      setError("Could not check the coupon. Please try again.");
    } finally {
      setCheckingCoupon(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    setError("");

    if (name.trim().length < 2) return setError("Please enter your full name.");
    if (!/^[0-9+\s-]{10,}$/.test(whatsapp.trim())) return setError("Please enter a valid WhatsApp number.");
    if (transactionId.trim().length < 4) return setError("Please enter the Transaction ID from your payment SMS.");
    if (!file) return setError("Please upload your payment screenshot.");

    inFlight.current = true;
    setSubmitting(true);
    try {
      // 1. Screenshot -> storage (path only ever reaches the database)
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: fd,
          headers: { "x-upload-token": uploadToken },
        });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Screenshot upload failed. Please try again.");

      // 2. Order -> server recomputes the price from the database
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id,
          customerName: name.trim(),
          whatsapp: whatsapp.trim(),
          paymentMethod: method,
          transactionId: transactionId.trim(),
          couponCode: coupon?.code ?? null,
          screenshotPath: uploadData.path,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "We could not place your order.");

      router.push(`/order/${orderData.orderNumber}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      inFlight.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-bs-line bg-white p-5 shadow-bs-card">
      <h2 className="text-base font-extrabold text-bs-ink">Payment</h2>
      <p className="mt-1 text-xs text-bs-muted">
        Send {taka(pkg.finalPrice)} to the number below, then submit your transaction details.
      </p>

      {/* ---- method selector ---- */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {METHODS.map((m) => {
          const active = method === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setMethod(m.key)}
              aria-pressed={active}
              className={`rounded-xl border-2 px-3 py-3 text-center transition ${
                active
                  ? `${m.active} shadow-bs-lift`
                  : "border-bs-line bg-white text-bs-muted hover:border-slate-300"
              }`}
            >
              <span className="block text-sm font-extrabold">{m.label}</span>
              <span className="block text-[10px] font-medium opacity-75">{m.hint}</span>
            </button>
          );
        })}
      </div>

      {/* ---- send money target ---- */}
      <div className="mt-4 rounded-xl border border-bs-line bg-bs-bg p-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wide text-bs-muted">
          Send Money To ({method})
        </p>
        <p className="mt-1 text-xl font-extrabold tracking-wide text-bs-ink">
          {payNumber || "Not configured"}
        </p>
        {settings.qrCodeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.qrCodeUrl}
            alt="Payment QR code"
            className="mx-auto mt-3 h-32 w-32 rounded-xl object-cover"
            loading="lazy"
          />
        ) : null}
        {settings.paymentNotice ? (
          <p className="mt-3 text-[11px] leading-relaxed text-bs-muted">{settings.paymentNotice}</p>
        ) : null}
      </div>

      {/* ---- coupon ---- */}
      <div className="mt-4">
        <label htmlFor="coupon" className="mb-1 block text-xs font-bold text-bs-muted">
          Coupon Code (optional)
        </label>
        <div className="flex gap-2">
          <input
            id="coupon"
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value);
              setCoupon(null);
            }}
            placeholder="e.g. SAVE10"
            className="w-full rounded-xl border border-bs-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-bs-primary"
          />
          <button
            type="button"
            onClick={applyCoupon}
            disabled={checkingCoupon || !couponCode.trim()}
            className="shrink-0 rounded-xl border border-bs-line px-4 text-sm font-bold text-bs-ink transition hover:border-bs-primary hover:text-bs-primary disabled:opacity-50"
          >
            {checkingCoupon ? "Checking…" : "Apply"}
          </button>
        </div>
        {coupon ? <p className="mt-1 text-xs font-semibold text-bs-success">✓ {coupon.note}</p> : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
        <Field label="Your Name *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            autoComplete="name"
            required
            className="w-full rounded-xl border border-bs-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-bs-primary"
          />
        </Field>

        <Field label="WhatsApp Number *">
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="01XXXXXXXXX"
            inputMode="tel"
            autoComplete="tel"
            required
            className="w-full rounded-xl border border-bs-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-bs-primary"
          />
        </Field>

        <Field label="Transaction ID *">
          <input
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="From your payment SMS"
            required
            className="w-full rounded-xl border border-bs-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-bs-primary"
          />
        </Field>

        <Field label="Payment Screenshot *">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
            className="w-full rounded-xl border border-dashed border-bs-line bg-bs-bg px-3 py-3 text-xs text-bs-muted file:mr-3 file:rounded-lg file:border-0 file:bg-bs-primary file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
          />
          {file ? (
            <p className="mt-1 text-[11px] font-semibold text-bs-success">
              ✓ {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
            </p>
          ) : null}
        </Field>

        {error ? (
          <p role="alert" className="rounded-xl bg-bs-danger-soft px-3 py-2.5 text-xs font-semibold text-bs-danger">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between border-t border-bs-line pt-4">
          <span className="text-xs font-semibold text-bs-muted">Total Payable</span>
          <span className="text-lg font-extrabold text-bs-ink">{taka(pkg.finalPrice)}</span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-bs-primary px-5 py-3.5 text-sm font-bold text-white shadow-bs-card transition hover:bg-bs-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Submitting…
            </span>
          ) : (
            "Confirm Order"
          )}
        </button>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-bs-muted">{label}</span>
      {children}
    </label>
  );
}
