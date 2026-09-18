"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";

export type PublicReview = {
  id: number;
  name: string;
  packageName: string;
  rating: number;
  message: string;
  createdAt: string;
};

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-500" aria-label={`${value} out of 5`}>
      {"★".repeat(Math.max(0, Math.min(5, value)))}
      <span className="text-slate-200">
        {"★".repeat(Math.max(0, 5 - Math.min(5, value)))}
      </span>
    </span>
  );
}

export default function ReviewsView({
  initialReviews,
  packageNames,
}: {
  initialReviews: PublicReview[];
  packageNames: string[];
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [customer, setCustomer] = useState<{ id: number; name: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [packageName, setPackageName] = useState(packageNames[0] ?? "");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/customer/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setCustomer(data.customer ?? null))
      .catch(() => setCustomer(null));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    if (message.trim().length < 10) {
      setStatus({ kind: "error", text: "Please write at least 10 characters." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, packageName, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", text: data.error || "Could not submit the review." });
        return;
      }
      setMessage("");
      setStatus({
        kind: "ok",
        text: "Thank you! Your review was submitted and will appear once our team approves it.",
      });
      const refreshed = await fetch("/api/reviews", { cache: "no-store" });
      const payload = await refreshed.json();
      setReviews(payload.reviews ?? []);
    } catch {
      setStatus({ kind: "error", text: "Network problem. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="card p-4 sm:p-5">
        <p className="text-sm font-extrabold text-navy">Write a review</p>
        {customer ? (
          <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
            <div>
              <span className="label">Your rating</span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    aria-label={`${value} star`}
                    className={`text-2xl leading-none transition ${
                      value <= rating ? "text-amber-500" : "text-slate-200"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {packageNames.length > 0 ? (
              <div>
                <label className="label" htmlFor="review-package">
                  Package you ordered
                </label>
                <select
                  id="review-package"
                  className="input"
                  value={packageName}
                  onChange={(event) => setPackageName(event.target.value)}
                >
                  <option value="">Select a package (optional)</option>
                  {packageNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label className="label" htmlFor="review-message">
                Your review
              </label>
              <textarea
                id="review-message"
                className="input min-h-[110px]"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="How was the quality, delivery time and support?"
                maxLength={600}
                required
              />
            </div>

            {status ? (
              <p
                className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                  status.kind === "ok"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {status.text}
              </p>
            ) : null}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Submitting…" : "Submit review"}
            </button>
            <p className="text-[11px] text-slate-400">
              Posted as {customer.name || "you"}. Reviews are published after admin approval.
            </p>
          </form>
        ) : (
          <div className="mt-3 rounded-xl bg-slate-50 p-4 text-center">
            <p className="text-xs text-slate-500">
              Sign in with your WhatsApp number and PIN to write a review.
            </p>
            <Link href="/profile" className="btn-primary mt-3 px-4 py-2.5 text-xs">
              Sign in to review
            </Link>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-navy">
            Customer reviews {reviews.length > 0 ? `(${reviews.length})` : ""}
          </h2>
          <Link href="/" className="text-xs font-bold text-blue-600">
            Order now →
          </Link>
        </div>

        {reviews.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-400">
            No reviews published yet — be the first to write one.
          </div>
        ) : (
          reviews.map((review) => (
            <article key={review.id} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {review.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-navy">{review.name}</p>
                    {review.packageName ? (
                      <p className="text-[11px] text-slate-400">{review.packageName}</p>
                    ) : null}
                  </div>
                </div>
                <Stars value={review.rating} />
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-slate-600">{review.message}</p>
              <p className="mt-2 text-[11px] text-slate-400">{formatDateTime(review.createdAt)}</p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
