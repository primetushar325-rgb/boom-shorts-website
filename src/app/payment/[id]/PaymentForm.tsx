"use client";

import { useState } from "react";
import Link from "next/link";
import { taka, buildWhatsAppLink, orderWhatsAppMessage } from "@/lib/format";

type Props = {
  pkg: { id: number; name: string; price: string };
  settings: {
    siteName: string;
    whatsappNumber: string;
    bkashNumber: string;
    nagadNumber: string;
    rocketNumber: string;
    qrCodeUrl: string;
    paymentNotice: string;
  };
};

const methods = [
  { key: "bKash", color: "bg-pink-600", label: "bKash" },
  { key: "Nagad", color: "bg-orange-600", label: "Nagad" },
  { key: "Rocket", color: "bg-purple-700", label: "Rocket" },
] as const;

export default function PaymentForm({ pkg, settings }: Props) {
  const [method, setMethod] = useState<(typeof methods)[number]["key"]>("bKash");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; percent: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const basePrice = Number(pkg.price);
  const finalPrice = couponApplied ? Math.round(basePrice * (1 - couponApplied.percent / 100)) : basePrice;

  const numberByMethod: Record<string, string> = {
    bKash: settings.bkashNumber,
    Nagad: settings.nagadNumber,
    Rocket: settings.rocketNumber,
  };

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponMessage("Checking...");
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponCode }),
    });
    const data = await res.json();
    if (data.valid) {
      setCouponApplied({ code: data.code, percent: data.discountPercent });
      setCouponMessage(`✅ Coupon applied: ${data.discountPercent}% off`);
    } else {
      setCouponApplied(null);
      setCouponMessage("❌ Invalid or expired coupon");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !phone.trim() || !transactionId.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      let screenshotUrl = "";
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
        screenshotUrl = uploadData.url;
      }

      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          whatsapp: phone,
          packageId: pkg.id,
          packageName: pkg.name,
          price: finalPrice,
          couponCode: couponApplied?.code || null,
          paymentMethod: method,
          transactionId,
          screenshotUrl,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to place order");

      const message = orderWhatsAppMessage({
        name,
        phone,
        packageName: pkg.name,
        price: finalPrice,
        transactionId,
      });
      const waLink = buildWhatsAppLink(settings.whatsappNumber, message);
      window.open(waLink, "_blank");

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-5 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/20 text-3xl">✅</div>
          <h1 className="mt-4 text-xl font-extrabold">Order Received!</h1>
          <p className="mt-2 text-sm text-slate-400">
            Thank you {name}! Your order for <strong className="text-white">{pkg.name}</strong> has been submitted.
            We opened WhatsApp for you — please send the message to confirm faster.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-gradient-to-r from-amber-400 to-yellow-600 px-6 py-3 text-sm font-bold"
          >
            ← Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-white">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          ← Back to {settings.siteName}
        </Link>

        <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur">
          <h1 className="text-xl font-extrabold">Complete Your Payment</h1>
          <p className="mt-1 text-sm text-slate-400">Fill in your details to confirm the order.</p>

          <div className="mt-5 flex items-center justify-between rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3">
            <span className="text-sm font-semibold text-slate-200">{pkg.name}</span>
            <span className="text-lg font-extrabold text-amber-200">{taka(finalPrice)}</span>
          </div>

          <div className="mt-5 flex gap-2">
            {methods.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethod(m.key)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold transition ${
                  method === m.key ? `${m.color} text-white` : "bg-white/5 text-slate-400"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-500">Send Money To</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{numberByMethod[method] || "N/A"}</p>
            {settings.qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.qrCodeUrl} alt="QR Code" className="mx-auto mt-3 h-36 w-36 rounded-xl object-cover" />
            ) : null}
            <p className="mt-3 text-xs text-amber-300">{settings.paymentNotice}</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400">Customer Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-amber-300"
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400">WhatsApp Number *</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-amber-300"
                placeholder="01XXXXXXXXX"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400">Coupon Code (optional)</label>
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-amber-300"
                  placeholder="e.g. SAVE10"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  className="whitespace-nowrap rounded-xl bg-white/10 px-4 text-sm font-semibold hover:bg-white/20"
                >
                  Apply
                </button>
              </div>
              {couponMessage ? <p className="mt-1 text-xs text-slate-400">{couponMessage}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400">Transaction ID *</label>
              <input
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-amber-300"
                placeholder="TrxID from payment app"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400">Payment Screenshot</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-white"
              />
            </div>

            {error ? <p className="text-sm font-semibold text-red-400">{error}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-400/30 transition hover:scale-[1.01] disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "✅ Confirm Payment"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
