"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ProofSlide = { id: number; imageUrl: string; caption: string };

const HOLD_MS = 2800; // time a card stays centered
const TRANSITION_MS = 620; // smooth transform/scale transition

/**
 * Client reviews — center-large carousel.
 *
 *   small card  ·  [ BIG CENTER CARD ]  ·  small card
 *
 * Motion is "hold → change → hold", never a continuous marquee: the active
 * card rests centered for ~2.8s, then the track transitions to the next one.
 * Supports touch swipe, prev/next buttons and dots. Autoplay and all motion
 * stop under `prefers-reduced-motion: reduce`.
 *
 * Renders only the real proof slides passed in — no invented reviews.
 */
export default function ClientReviewSlider({ items }: { items: ProofSlide[] }) {
  const count = items.length;
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  const go = useCallback(
    (dir: number) => {
      if (count === 0) return;
      setActive((current) => (current + dir + count) % count);
    },
    [count],
  );

  // Autoplay: hold, then advance. Cleared while paused/hovered or reduced-motion.
  useEffect(() => {
    if (reduced || paused || count <= 1) return;
    const timer = window.setTimeout(() => go(1), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [active, reduced, paused, count, go]);

  if (count === 0) return null;

  function onTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0].clientX;
    touchDeltaX.current = 0;
    setPaused(true);
  }
  function onTouchMove(event: React.TouchEvent) {
    if (touchStartX.current === null) return;
    touchDeltaX.current = event.touches[0].clientX - touchStartX.current;
  }
  function onTouchEnd() {
    if (Math.abs(touchDeltaX.current) > 40) go(touchDeltaX.current < 0 ? 1 : -1);
    touchStartX.current = null;
    touchDeltaX.current = 0;
    setPaused(false);
  }

  return (
    <section
      id="client-reviews"
      className="relative overflow-hidden py-10 sm:py-14"
      aria-roledescription="carousel"
      aria-label="Client review screenshots"
    >
      <div className="mb-7 px-4 text-center">
        <span className="badge-info">★ Client Reviews</span>
        <h2 className="section-title">Real Results, Real Clients</h2>
        <p className="section-sub">
          Screenshots straight from our clients&apos; YouTube Studio &amp; WhatsApp — no filters, no
          edits.
        </p>
      </div>

      <div
        className="relative mx-auto flex h-[380px] max-w-6xl items-center justify-center sm:h-[470px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {items.map((item, index) => {
          // shortest signed distance on the ring
          let offset = index - active;
          if (offset > count / 2) offset -= count;
          if (offset < -count / 2) offset += count;

          const abs = Math.abs(offset);
          const visible = abs <= 2;
          const isCenter = offset === 0;

          const translate = offset * 62; // % of card width
          const scale = isCenter ? 1 : abs === 1 ? 0.78 : 0.6;
          const opacity = isCenter ? 1 : abs === 1 ? 0.5 : 0.22;

          return (
            <figure
              key={item.id}
              aria-hidden={!isCenter}
              className="absolute w-[190px] overflow-hidden rounded-2xl sm:w-[260px]"
              style={{
                transform: `translateX(${translate}%) scale(${scale})`,
                opacity: visible ? opacity : 0,
                zIndex: 10 - abs,
                pointerEvents: visible ? "auto" : "none",
                transition: reduced
                  ? "none"
                  : `transform ${TRANSITION_MS}ms cubic-bezier(0.22,1,0.36,1), opacity ${TRANSITION_MS}ms ease, box-shadow ${TRANSITION_MS}ms ease`,
                border: isCenter
                  ? "1px solid rgba(212,175,55,0.75)"
                  : "1px solid rgba(212,175,55,0.16)",
                background: "linear-gradient(180deg,#141416 0%,#0b0b0d 100%)",
                boxShadow: isCenter
                  ? "0 0 34px -8px rgba(212,175,55,0.6), 0 26px 50px -28px rgba(0,0,0,1)"
                  : "0 18px 38px -26px rgba(0,0,0,0.95)",
                filter: isCenter ? "none" : "grayscale(0.35)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.caption || "Client review proof"}
                className="h-[290px] w-full object-cover sm:h-[380px]"
                loading={index < 3 ? "eager" : "lazy"}
                draggable={false}
              />
              {item.caption ? (
                <figcaption className="px-2 py-2 text-center text-[11px] text-muted">
                  {item.caption}
                </figcaption>
              ) : null}
            </figure>
          );
        })}

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous review"
              className="absolute left-2 z-20 grid h-10 w-10 place-items-center rounded-full text-gold transition hover:text-gold-light sm:left-6"
              style={{
                border: "1px solid rgba(212,175,55,0.45)",
                background: "rgba(8,8,10,0.85)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 5-7 7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next review"
              className="absolute right-2 z-20 grid h-10 w-10 place-items-center rounded-full text-gold transition hover:text-gold-light sm:right-6"
              style={{
                border: "1px solid rgba(212,175,55,0.45)",
                background: "rgba(8,8,10,0.85)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 5 7 7-7 7" />
              </svg>
            </button>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 px-4">
          {items.slice(0, 12).map((item, index) => {
            const on = index === active;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Go to review ${index + 1}`}
                aria-current={on ? "true" : undefined}
                className="h-2 rounded-full transition-all"
                style={{
                  width: on ? 22 : 8,
                  background: on
                    ? "linear-gradient(90deg,#f5d76e,#d4af37)"
                    : "rgba(212,175,55,0.28)",
                }}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
