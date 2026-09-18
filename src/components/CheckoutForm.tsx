"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Check,
  Copy,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  ReceiptText,
  TriangleAlert,
} from "lucide-react";
import {
  buildWhatsAppLink,
  formatDateTime,
  orderStatusLabel,
  orderWhatsAppMessage,
  taka,
} from "@/lib/format";
import { parseVideoUrl } from "@/lib/youtube";
import { compressScreenshot, type PreparedScreenshot } from "@/lib/screenshot";

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
  packageQuantity?: string;
  quantity: number;
  unitPrice?: number;
  originalPrice?: number;
  discountAmount?: number;
  couponCode?: string | null;
  couponDiscount?: number;
  price: number;
  paymentMethod: string;
  paymentNumber?: string;
  whatsapp?: string;
  transactionId: string;
  customerNote?: string;
  status: string;
  paymentStatus: string;
  screenshotStored?: boolean;
  createdAt: string;
};

const MAX_QUANTITY = 20;
/** Safety net so the button can never stay stuck in "Submitting…". */
const SUBMIT_TIMEOUT_MS = 45_000;

/** Reads a response as JSON, falling back to a useful message for HTML errors. */
async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    // A gateway/proxy error page (502/504/413) is not JSON. Surface the status
    // instead of pretending the network died.
    return { error: `Server responded with ${res.status}. Please try again.` };
  }
}

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
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [prepared, setPrepared] = useState<PreparedScreenshot | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);
  const [wasDuplicate, setWasDuplicate] = useState(false);
  const [copied, setCopied] = useState(false);

  // A real mobile double-tap fires two submits before React can re-render, so
  // `submitting` state alone is not enough — the ref flips synchronously.
  const inFlight = useRef(false);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (watchdog.current) clearTimeout(watchdog.current);
    };
  }, []);

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

  const whatsappMessage = useMemo(
    () =>
      orderWhatsAppMessage({
        orderCode: result?.orderCode,
        name: name.trim(),
        phone: phone.trim(),
        packageName: result?.packageName ?? pkg.name,
        packageQuantity: result?.packageQuantity ?? pkg.quantityLabel,
        quantity: result?.quantity ?? quantity,
        originalPrice: result?.originalPrice ?? subtotal,
        discount: result?.discountAmount ?? packageDiscount,
        couponCode: result?.couponCode ?? coupon?.code ?? null,
        couponDiscount: result?.couponDiscount ?? couponDiscount,
        amount: result?.price ?? total,
        paymentMethod: result?.paymentMethod ?? method,
        paymentNumber: result?.paymentNumber ?? paymentNumber.trim() ?? phone.trim(),
        transactionId: result?.transactionId ?? transactionId.trim(),
        note: result?.customerNote ?? note.trim(),
      }),
    [
      result,
      name,
      phone,
      quantity,
      subtotal,
      packageDiscount,
      coupon,
      couponDiscount,
      total,
      method,
      paymentNumber,
      transactionId,
      note,
      pkg.name,
      pkg.quantityLabel,
    ],
  );

  const whatsappHref = buildWhatsAppLink(settings.whatsappNumber, whatsappMessage);

  async function handleFile(next: File | null) {
    setFile(next);
    setPrepared(null);
    setError("");
    if (!next) return;
    setPreparing(true);
    try {
      // Phones routinely produce 4–10 MB screenshots. Vercel rejects request
      // bodies over 4.5 MB *before* our code runs, which used to look like a
      // network failure to the customer. Re-encode in the browser first.
      const ready = await compressScreenshot(next);
      setPrepared(ready);
      if (!ready.ok) {
        setError(
          "That screenshot could not be read. You can still submit the order and send the screenshot to us on WhatsApp.",
        );
      }
    } catch {
      setPrepared({ file: next, ok: true, compressed: false, bytes: next.size });
    } finally {
      setPreparing(false);
    }
  }

  async function applyCoupon() {
    const code = couponCode.trim();
    if (!code || checkingCoupon) return;
    setCheckingCoupon(true);
    setCouponMessage("Checking…");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, amount: afterPackage }),
      });
      const data = await readJson(res);
      if (res.ok && data.valid) {
        setCoupon({
          code: String(data.code ?? code),
          discount: Number(data.discount ?? 0),
          label: String(data.label ?? ""),
        });
        setCouponMessage(`Coupon applied — ${String(data.label || `${data.discountPercent ?? 0}% off`)}`);
      } else {
        setCoupon(null);
        setCouponMessage(String(data.error || "Invalid or expired coupon"));
      }
    } catch {
      setCoupon(null);
      setCouponMessage("Could not check the coupon. Please try again.");
    } finally {
      setCheckingCoupon(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current) return; // synchronous guard against a double tap
    setError("");

    const cleanPhone = phone.replace(/\D/g, "");
    if (!name.trim()) return setError("Please enter your name.");
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      return setError("Please enter a valid WhatsApp number (01XXXXXXXXX).");
    }
    if (!transactionId.trim()) return setError("Please enter the payment Transaction ID.");
    if (pin && !/^\d{4,6}$/.test(pin)) return setError("Your PIN must be 4–6 digits.");
    if (file && file.size > 20 * 1024 * 1024) {
      return setError("That screenshot is too large. Please use one smaller than 20MB.");
    }

    inFlight.current = true;
    setSubmitting(true);
    watchdog.current = setTimeout(() => {
      // Only fires if the fetch itself never settles (proxy hang, tab suspended).
      inFlight.current = false;
      setSubmitting(false);
      setError(
        "The order is taking longer than usual. Please check your connection and submit again — we never create two orders for the same Transaction ID.",
      );
    }, SUBMIT_TIMEOUT_MS);

    try {
      const form = new FormData();
      form.append("packageId", String(pkg.id));
      form.append("quantity", String(quantity));
      form.append("customerName", name.trim());
      form.append("whatsapp", phone.trim());
      form.append("paymentNumber", paymentNumber.trim() || phone.trim());
      form.append("paymentMethod", method);
      form.append("transactionId", transactionId.trim());
      form.append("note", note.trim());
      if (coupon) form.append("couponCode", coupon.code);
      if (pin) form.append("pin", pin);

      const upload = prepared?.ok ? prepared.file : null;
      if (upload) form.append("screenshot", upload);

      const res = await fetch("/api/orders", { method: "POST", body: form });
      const data = await readJson(res);

      if (!res.ok) {
        const message = typeof data.error === "string" && data.error.trim() ? data.error : "";
        setError(
          message ||
            (res.status === 413
              ? "That screenshot is too large to upload. Please submit the order without it and send it on WhatsApp."
              : `We could not save the order (error ${res.status}). Please try again.`),
        );
        return;
      }

      const order = data.order as OrderResult | undefined;
      if (!order?.orderCode) {
        setError("The server accepted the order but returned an unexpected response. Please contact us with your Transaction ID.");
        return;
      }

      setWasDuplicate(data.duplicate === true);
      setResult(order);
      // WhatsApp is opened by the customer tapping the button on the success
      // card. A `window.open()` here is not a user gesture any more (it runs
      // after an await) so mobile browsers silently block it — which looked
      // like "the order button did nothing".
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch {
      // Only a genuine transport failure reaches here.
      setError(
        "Network problem — the order did not reach our server. Please check your connection and submit again.",
      );
    } finally {
      if (watchdog.current) clearTimeout(watchdog.current);
      watchdog.current = null;
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-md">
        <div className="card p-5 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok-soft text-ok">
            <BadgeCheck size={30} strokeWidth={2} aria-hidden />
          </div>
          <h1 className="mt-3 text-lg font-extrabold text-warm">Order submitted!</h1>
          <p className="mt-1 text-sm text-muted">
            {wasDuplicate
              ? "We already had this payment on file, so we attached you to the existing order instead of creating a second one."
              : "We received your order. Payment verification usually takes a few minutes."}
          </p>

          <div className="mt-5 grid gap-2 rounded-2xl bg-white/5 p-4 text-left text-sm">
            <Row label="Order ID" value={result.orderCode} strong />
            <Row label="Package" value={result.packageName} />
            <Row label="Quantity" value={String(result.quantity)} />
            <Row label="Amount" value={taka(result.price)} strong />
            <Row label="Payment method" value={result.paymentMethod} />
            <Row label="Transaction ID" value={result.transactionId} />
            <Row label="Status" value={orderStatusLabel(result.status)} />
            <Row label="Date" value={formatDateTime(result.createdAt)} />
          </div>

          {result.screenshotStored === false ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-gold-soft px-3 py-2 text-left text-xs font-semibold text-gold-light">
              <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                Your screenshot could not be uploaded. Please send it to us on WhatsApp with your
                Order ID — your order itself is saved.
              </span>
            </p>
          ) : null}

          <p className="mt-3 text-[11px] text-muted-2">
            Save your Order ID — you need it to track this order.
          </p>

          <div className="mt-5 flex flex-col gap-2">
            {/* wa.me click-to-chat: the message is prefilled, the customer taps
                send. This is not automatic server-side sending. */}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp w-full"
            >
              <MessageCircle size={17} aria-hidden />
              Send order details on WhatsApp
            </a>
            <Link href="/orders" className="btn-outline w-full">
              <ReceiptText size={16} aria-hidden />
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
      <div className="flex min-w-0 flex-col gap-4">
        <section className="card p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-soft text-xl">
              {pkg.icon}
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-warm sm:text-lg">{pkg.name}</h1>
              {pkg.description ? (
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{pkg.description}</p>
              ) : null}
              {pkg.quantityLabel ? (
                <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] font-semibold text-warm-dim">
                  {pkg.quantityLabel}
                </p>
              ) : null}
            </div>
          </div>

          {pkg.features.length > 0 ? (
            <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
              {pkg.features.map((feature) => (
                <li key={feature} className="feature-tick">
                  <Check size={14} strokeWidth={3} className="mt-0.5 shrink-0 text-gold" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {demoVideo ? (
          <section className="card overflow-hidden">
            <p className="border-b border-line-soft px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted">
              Package demo video
            </p>
            <div className="aspect-video w-full bg-black">
              <iframe
                className="h-full w-full"
                src={demoVideo.embedUrl}
                title={`${pkg.name} demo`}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </section>
        ) : null}

        <section className="card p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Quantity</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="grid h-11 w-11 place-items-center rounded-xl border border-line text-warm-dim"
              aria-label="Decrease quantity"
            >
              <Minus size={16} aria-hidden />
            </button>
            <span className="min-w-[3rem] text-center text-lg font-extrabold tabular-nums text-warm">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(MAX_QUANTITY, value + 1))}
              className="grid h-11 w-11 place-items-center rounded-xl border border-line text-warm-dim"
              aria-label="Increase quantity"
            >
              <Plus size={16} aria-hidden />
            </button>
            <span className="text-xs text-muted-2">max {MAX_QUANTITY}</span>
          </div>

          <div className="mt-4 grid gap-1.5 border-t border-line-soft pt-4 text-sm">
            <Line label={`Original price × ${quantity}`} value={taka(subtotal)} />
            {packageDiscount > 0 ? (
              <Line label="Package discount" value={`− ${taka(packageDiscount)}`} tone="red" />
            ) : null}
            {couponDiscount > 0 ? (
              <Line label={`Coupon ${coupon?.code}`} value={`− ${taka(couponDiscount)}`} tone="red" />
            ) : null}
            <div className="mt-1 flex items-center justify-between border-t border-line-soft pt-2">
              <span className="text-sm font-bold text-warm">Total payable</span>
              <span className="text-xl font-extrabold text-gold">{taka(total)}</span>
            </div>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Coupon (optional)</p>
          <div className="mt-2 flex gap-2">
            <input
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              placeholder="e.g. SAVE10"
              className="input min-w-0 flex-1"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={checkingCoupon || !couponCode.trim()}
              className="btn-outline shrink-0 px-4"
            >
              {checkingCoupon ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
              Apply
            </button>
          </div>
          {couponMessage ? (
            <p
              className={`mt-2 flex items-start gap-1.5 text-xs font-semibold ${
                coupon ? "text-ok" : "text-muted"
              }`}
            >
              {coupon ? null : <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />}
              {couponMessage}
            </p>
          ) : null}
        </section>
      </div>

      {/* ---------------- payment + customer details ---------------- */}
      <div className="flex min-w-0 flex-col gap-4">
        <section className="card p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Payment method</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {methods.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setMethod(item.key)}
                aria-pressed={method === item.key}
                className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  method === item.key
                    ? "border-gold bg-gold-soft text-gold-light"
                    : "border-line bg-coal text-warm-dim"
                }`}
              >
                {item.key}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-line bg-white/5 p-3.5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">
              Send money to ({method})
            </p>
            <p className="mt-1 break-all text-xl font-extrabold tracking-wide text-warm">
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
                {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                {copied ? "Copied" : "Copy number"}
              </button>
            ) : null}
            {settings.qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.qrCodeUrl}
                alt="Payment QR code"
                width={128}
                height={128}
                className="mx-auto mt-3 h-32 w-32 rounded-xl border border-line bg-coal object-contain"
                loading="lazy"
                decoding="async"
              />
            ) : null}
            {settings.paymentNotice ? (
              <p className="mt-3 text-[11px] leading-relaxed text-gold-light">
                {settings.paymentNotice}
              </p>
            ) : null}
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Your information</p>
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
                autoComplete="tel"
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
                autoComplete="off"
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
                onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
                className="input file:mr-3 file:rounded-lg file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink"
              />
              <p className="mt-1 text-[11px] text-muted-2">
                {preparing
                  ? "Preparing your screenshot…"
                  : prepared?.ok
                    ? `Ready to upload · ${Math.max(1, Math.round(prepared.bytes / 1024))} KB${
                        prepared.compressed ? " (optimised for a faster upload)" : ""
                      }. Stored privately — only our team can view it.`
                    : "JPG/PNG/WebP. Stored privately — only our team can view it. Optional: you can send it on WhatsApp instead."}
              </p>
            </div>
            <div>
              <label className="label" htmlFor="note">
                Note for our team (optional)
              </label>
              <textarea
                id="note"
                className="input min-h-[72px]"
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, 500))}
                placeholder="Channel link, video style, deadline…"
                maxLength={500}
              />
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
                autoComplete="off"
              />
              <p className="mt-1 text-[11px] text-muted-2">
                Optional. Leaving it empty never affects your order.
              </p>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-xl bg-bad-soft px-3 py-2 text-xs font-semibold text-bad"
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="btn-gold btn-shine mt-4 w-full py-3.5 text-[15px]"
          >
            {submitting ? (
              <>
                <Loader2 size={17} className="animate-spin" aria-hidden />
                Submitting your order…
              </>
            ) : (
              `Confirm order · ${taka(total)}`
            )}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-2">
            Prices are verified on our server before the order is saved. Submitting twice with the
            same Transaction ID never creates a second order.
          </p>
        </section>

        <Link href="/#boom-shorts" className="btn-ghost w-full py-2.5 text-xs">
          <ArrowLeft size={14} aria-hidden />
          Choose a different package
        </Link>
      </div>
    </form>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted">{label}</span>
      <span
        className={`break-words text-right text-[13px] ${
          strong ? "font-extrabold text-warm" : "font-semibold text-warm-dim"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: "red" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-sm font-semibold ${tone === "red" ? "text-bad" : "text-warm-dim"}`}>
        {value}
      </span>
    </div>
  );
}
