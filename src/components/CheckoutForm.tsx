"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { buildWhatsAppLink, formatDateTime, orderStatusLabel, orderWhatsAppMessage, taka } from "@/lib/format";
import { parseVideoUrl } from "@/lib/youtube";

export type CheckoutPackage = {
  id: number;
  name: string;
  description: string;
  icon: string;
  quantityLabel: string;
  features: string[];
  demoVideoUrl: string;
  unitOriginal: number;
  unitFinal: number;
  discountAmount: number;
  discountPercent: number;
  available: boolean;
};

export type CheckoutSettings = {
  siteName: string;
  whatsappNumber: string;
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  qrCodeUrl: string;
  paymentNotice: string;
};

type OrderResult = {
  orderCode: string;
  packageName: string;
  quantity: number;
  price: number;
  paymentMethod: string;
  transactionId: string;
  status: string;
  paymentStatus: string;
  screenshotStored?: boolean;
  createdAt: string;
};

const MAX_QUANTITY = 20;

export default function CheckoutForm({
  pkg,
  settings,
}: {
  pkg: CheckoutPackage;
  settings: CheckoutSettings;
}) {
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<"bKash" | "Nagad" | "Rocket">("bKash");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentNumber, setPaymentNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [pin, setPin] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);
  const [copied, setCopied] = useState(false);

  const methods = useMemo(() => {
    const list: { key: "bKash" | "Nagad" | "Rocket"; number: string }[] = [
      { key: "bKash", number: settings.bkashNumber },
      { key: "Nagad", number: settings.nagadNumber },
    ];
    if (settings.rocketNumber) list.push({ key: "Rocket", number: settings.rocketNumber });
    return list;
  }, [settings.bkashNumber, settings.nagadNumber, settings.rocketNumber]);

  const activeMethod = methods.find((item) => item.key === method) ?? methods[0];

  const subtotal = pkg.unitOriginal * quantity;
  const packageDiscount = pkg.discountAmount * quantity;
  const afterPackage = pkg.unitFinal * quantity;
  const couponDiscount = coupon ? Math.min(coupon.discount, afterPackage) : 0;
  const total = Math.max(0, afterPackage - couponDiscount);

  const demoVideo = parseVideoUrl(pkg.demoVideoUrl);

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponMessage("Checking…");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, amount: afterPackage }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setCoupon({ code: data.code, discount: Number(data.discount ?? 0), label: data.label ?? "" });
        setCouponMessage(`✅ Coupon applied — ${data.label || `${data.discountPercent}% off`}`);
      } else {
        setCoupon(null);
        setCouponMessage(`❌ ${data.error || "Invalid or expired coupon"}`);
      }
    } catch {
      setCoupon(null);
      setCouponMessage("❌ Could not check the coupon. Please try again.");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError("");

    if (!name.trim()) return setError("Please enter your name.");
    if (!/^01[3-9]\d{8}$/.test(phone.replace(/\D/g, "")))
      return setError("Please enter a valid WhatsApp number (01XXXXXXXXX).");
    if (!transactionId.trim()) return setError("Please enter the payment Transaction ID.");
    if (pin && !/^\d{4,6}$/.test(pin)) return setError("Your PIN must be 4–6 digits.");
    if (file && file.size > 6 * 1024 * 1024) return setError("Screenshot must be smaller than 6MB.");

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("packageId", String(pkg.id));
      form.append("quantity", String(quantity));
      form.append("customerName", name.trim());
      form.append("whatsapp", phone.trim());
      form.append("paymentNumber", paymentNumber.trim() || phone.trim());
      form.append("paymentMethod", method);
      form.append("transactionId", transactionId.trim());
      if (coupon) form.append("couponCode", coupon.code);
      if (pin) form.append("pin", pin);
      if (file) form.append("screenshot", file);

      const res = await fetch("/api/orders", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setResult(data.order);
      const message = orderWhatsAppMessage({
        orderCode: data.order.orderCode,
        name: name.trim(),
        phone: phone.trim(),
        packageName: data.order.packageName,
        quantity: data.order.quantity,
        amount: data.order.price,
        paymentMethod: data.order.paymentMethod,
        transactionId: data.order.transactionId,
      });
      const whatsappUrl = buildWhatsAppLink(
        settings.whatsappNumber,
        message,
      );
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } catch {
      setError("Network problem — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-md">
        <div className="card p-5 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-2xl">
            ✅
          </div>
          <h1 className="mt-3 text-lg font-extrabold text-navy">Order submitted!</h1>
          <p className="mt-1 text-sm text-slate-500">
            We received your order. Payment verification usually takes a few minutes.
          </p>

          <div className="mt-5 grid gap-2 rounded-2xl bg-slate-50 p-4 text-left text-sm">
            <Row label="Order ID" value={result.orderCode} strong />
            <Row label="Package" value={result.packageName} />
            <Row label="Quantity" value={String(result.quantity)} />
            <Row label="Amount" value={taka(result.price)} strong />
            <Row label="Payment method" value={result.paymentMethod} />
            <Row label="Transaction ID" value={result.transactionId} />
            <Row label="Status" value={orderStatusLabel(result.status)} />
            <Row label="Date" value={formatDateTime(result.createdAt)} />
          </div>

          {result.screenshotStored === false && (
            <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
              Your screenshot could not be uploaded. Please send it to us on WhatsApp with your
              Order ID.
            </p>
          )}

          <p className="mt-3 text-[11px] text-slate-400">
            Save your Order ID — you need it to track this order.
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <a
              href={buildWhatsAppLink(
                settings.whatsappNumber,
                orderWhatsAppMessage({
                  orderCode: result.orderCode,
                  packageName: result.packageName,
                  quantity: result.quantity,
                  amount: result.price,
                  paymentMethod: result.paymentMethod,
                  transactionId: result.transactionId,
                  phone,
                }),
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp w-full"
            >
              Send on WhatsApp
            </a>
            <Link href="/orders" className="btn-outline w-full">
              View my orders
            </Link>
            <Link href="/" className="btn-ghost w-full">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      {/* ---------------- package + pricing ---------------- */}
      <div className="flex flex-col gap-4">
        <section className="card p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-xl">
              {pkg.icon}
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-navy sm:text-lg">{pkg.name}</h1>
              {pkg.description ? (
                <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{pkg.description}</p>
              ) : null}
              {pkg.quantityLabel ? (
                <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                  ⏱ {pkg.quantityLabel}
                </p>
              ) : null}
            </div>
          </div>

          {pkg.features.length > 0 ? (
            <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
              {pkg.features.map((feature) => (
                <li key={feature} className="feature-tick">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {demoVideo ? (
          <section className="card overflow-hidden">
            <p className="border-b border-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              Package demo video
            </p>
            <div className="aspect-video w-full bg-black">
              <iframe
                className="h-full w-full"
                src={demoVideo.embedUrl}
                title={`${pkg.name} demo`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </section>
        ) : null}

        <section className="card p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Quantity</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-lg font-bold text-slate-600"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="min-w-[3rem] text-center text-lg font-extrabold text-navy">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(MAX_QUANTITY, value + 1))}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-lg font-bold text-slate-600"
              aria-label="Increase quantity"
            >
              +
            </button>
            <span className="text-xs text-slate-400">max {MAX_QUANTITY}</span>
          </div>

          <div className="mt-4 grid gap-1.5 border-t border-slate-100 pt-4 text-sm">
            <Line label={`Original price × ${quantity}`} value={taka(subtotal)} />
            {packageDiscount > 0 ? (
              <Line label="Package discount" value={`− ${taka(packageDiscount)}`} tone="red" />
            ) : null}
            {couponDiscount > 0 ? (
              <Line label={`Coupon ${coupon?.code}`} value={`− ${taka(couponDiscount)}`} tone="red" />
            ) : null}
            <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-2">
              <span className="text-sm font-bold text-navy">Total payable</span>
              <span className="text-xl font-extrabold text-blue-600">{taka(total)}</span>
            </div>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Coupon (optional)
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              placeholder="e.g. SAVE10"
              className="input flex-1"
            />
            <button type="button" onClick={applyCoupon} className="btn-outline px-4">
              Apply
            </button>
          </div>
          {couponMessage ? (
            <p className="mt-2 text-xs font-semibold text-slate-500">{couponMessage}</p>
          ) : null}
        </section>
      </div>

      {/* ---------------- payment + customer details ---------------- */}
      <div className="flex flex-col gap-4">
        <section className="card p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment method</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {methods.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setMethod(item.key)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  method === item.key
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {item.key}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Send money to ({method})
            </p>
            <p className="mt-1 text-xl font-extrabold tracking-wide text-navy">
              {activeMethod?.number || "—"}
            </p>
            {activeMethod?.number ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(activeMethod.number);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    setCopied(false);
                  }
                }}
                className="btn-ghost mt-2 px-3 py-1.5 text-[11px]"
              >
                {copied ? "Copied ✓" : "Copy number"}
              </button>
            ) : null}
            {settings.qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.qrCodeUrl}
                alt="Payment QR code"
                className="mx-auto mt-3 h-32 w-32 rounded-xl border border-slate-200 bg-white object-contain"
              />
            ) : null}
            {settings.paymentNotice ? (
              <p className="mt-3 text-[11px] leading-relaxed text-amber-700">
                {settings.paymentNotice}
              </p>
            ) : null}
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Your information
          </p>
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <label className="label" htmlFor="name">
                Your name *
              </label>
              <input
                id="name"
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="phone">
                WhatsApp number *
              </label>
              <input
                id="phone"
                className="input"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="01XXXXXXXXX"
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="paymentNumber">
                Payment number (the number you sent money from)
              </label>
              <input
                id="paymentNumber"
                className="input"
                value={paymentNumber}
                onChange={(event) => setPaymentNumber(event.target.value)}
                placeholder="01XXXXXXXXX"
                inputMode="tel"
              />
            </div>
            <div>
              <label className="label" htmlFor="transactionId">
                Transaction ID *
              </label>
              <input
                id="transactionId"
                className="input"
                value={transactionId}
                onChange={(event) => setTransactionId(event.target.value)}
                placeholder="e.g. 8N7A2K9Q1M"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="screenshot">
                Payment screenshot
              </label>
              <input
                id="screenshot"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="input file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                JPG/PNG/WebP up to 6MB. Stored privately — only our team can view it.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="pin">
                Create a 4–6 digit PIN (optional)
              </label>
              <input
                id="pin"
                className="input"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Used later to see your order history"
                inputMode="numeric"
              />
            </div>
          </div>

          {error ? (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={submitting} className="btn-primary mt-4 w-full py-3">
            {submitting ? "Submitting…" : `Confirm order · ${taka(total)}`}
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Prices are verified on our server before the order is saved.
          </p>
        </section>
      </div>
    </form>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-right text-[13px] ${strong ? "font-extrabold text-navy" : "font-semibold text-slate-700"}`}>
        {value}
      </span>
    </div>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: "red" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${tone === "red" ? "text-red-600" : "text-slate-700"}`}>
        {value}
      </span>
    </div>
  );
}
