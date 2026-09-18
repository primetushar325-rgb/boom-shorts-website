"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ProofSlide = { id: number; imageUrl: string; caption: string };

const HOLD_MS = 2800; // time a card stays centered
const TRANSITION_MS = 620; // smooth transform transition
const SWIPE_THRESHOLD_PX = 40;

/**
 * Client reviews — center-large carousel.
 *
 *   small card  ·  [ BIG CENTER CARD ]  ·  small card
 *
 * Motion is "hold → change → hold", never a continuous marquee: the active card
 * rests centered for ~2.8 s, then the track transitions to the next one.
 *
 * Scrolling behaviour (this is the part that used to fight the page):
 *  • `touch-action: pan-y` hands vertical gestures straight back to the browser,
 *    so a swipe down the page is never captured by the carousel;
 *  • a gesture only changes slide when it is clearly horizontal
 *    (|dx| > |dy| and > 40 px);
 *  • the touch handlers write to refs, never to state, so touching the carousel
 *    causes zero React re-renders;
 *  • only `transform` and `opacity` are transitioned — both are composited, so
 *    a slide change never repaints (the previous version also transitioned
 *    `box-shadow` and animated `filter: grayscale()`);
 *  • autoplay stops when the section is off-screen and under reduced motion.
 *
 * Renders only the real proof slides passed in — no invented reviews.
 */
export default function ClientReviewSlider({ items }: { items: ProofSlide[] }) {
  const count = items.length;
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  // Refs, not state: touching/leaving the carousel must not re-render 19 cards.
  const paused = useRef(false);
  const onScreen = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const touchDeltaY = useRef(0);

  const sectionRef = useRef<HTMLElement>(null);

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

  // Only tick while the carousel is actually visible.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      onScreen.current = true;
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen.current = Boolean(entry?.isIntersecting);
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Autoplay: hold, then advance. Skipped while paused/off-screen/reduced.
  useEffect(() => {
    if (reduced || count <= 1) return;
    if (paused.current || !onScreen.current) return;
    const timer = window.setTimeout(() => go(1), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [active, reduced, count, go]);

  if (count === 0) return null;

  function onTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
    paused.current = true; // ref write — no re-render
  }

  function onTouchMove(event: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touch = event.touches[0];
    if (!touch) return;
    touchDeltaX.current = touch.clientX - touchStartX.current;
    touchDeltaY.current = touch.clientY - touchStartY.current;
    // Never preventDefault(): vertical scrolling stays with the browser.
  }

  function onTouchEnd() {
    const dx = touchDeltaX.current;
    const dy = touchDeltaY.current;
    const horizontal = Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD_PX;
    if (horizontal) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
    touchStartY.current = null;
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
    paused.current = false;
  }

  return (
    <section
      ref={sectionRef}
      id="client-reviews"
      className="relative overflow-hidden py-10 sm:py-14"
      aria-roledescription="carousel"
      aria-label="Client review screenshots"
    >
      <div className="mb-7 px-4 text-center">
        <span className="badge-info">Client Reviews</span>
        <h2 className="section-title">Real Results, Real Clients</h2>
        <p className="section-sub">
          Screenshots straight from our clients&apos; YouTube Studio &amp; WhatsApp — no filters, no
          edits.
        </p>
      </div>

      <div
        className="relative mx-auto flex h-[380px] max-w-6xl items-center justify-center sm:h-[470px]"
        style={{ touchAction: "pan-y" }}
        onMouseEnter={() => {
          paused.current = true;
        }}
        onMouseLeave={() => {
          paused.current = false;
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {items.map((item, index) => {
          // shortest signed distance on the ring
          let offset = index - active;
          if (offset > count / 2) offset -= count;
          if (offset < -count / 2) offset += count;

          const abs = Math.abs(offset);
          // Only the five cards that can actually be seen are put in the DOM.
          // With 19 proof slides that is 19 <img> elements down to 5, which is
          // the difference between a smooth page and a phone decoding screenshots
          // in the background while you scroll.
          if (abs > 2) return null;

          const isCenter = offset === 0;
          const translate = offset * 62; // % of card width
          const scale = isCenter ? 1 : abs === 1 ? 0.78 : 0.6;
          const opacity = isCenter ? 1 : abs === 1 ? 0.5 : 0.22;

          return (
            <figure
              key={item.id}
              aria-hidden={!isCenter}
              role={isCenter ? "group" : undefined}
              aria-roledescription={isCenter ? "slide" : undefined}
              aria-label={isCenter ? `${index + 1} of ${count}` : undefined}
              className="absolute w-[190px] overflow-hidden rounded-2xl sm:w-[260px]"
              style={{
                transform: `translate3d(${translate}%, 0, 0) scale(${scale})`,
                opacity,
                zIndex: 10 - abs,
                pointerEvents: "none",
                transition: reduced
                  ? "none"
                  : `transform ${TRANSITION_MS}ms cubic-bezier(0.22,1,0.36,1), opacity ${TRANSITION_MS}ms ease`,
                // Static decoration: nothing here is transitioned, so moving the
                // carousel never triggers a repaint.
                border: "1px solid rgba(212,175,55,0.45)",
                background: "linear-gradient(180deg,#141416 0%,#0b0b0d 100%)",
                boxShadow: "0 0 34px -10px rgba(212,175,55,0.5), 0 26px 50px -28px rgba(0,0,0,1)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.caption || "Client review proof"}
                width={260}
                height={380}
                className="h-[290px] w-full object-cover sm:h-[380px]"
                loading={abs <= 1 ? "eager" : "lazy"}
                decoding="async"
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
              className="absolute left-2 z-20 grid h-11 w-11 place-items-center rounded-full text-gold transition hover:text-gold-light sm:left-6"
              style={{
                border: "1px solid rgba(212,175,55,0.45)",
                background: "rgba(8,8,10,0.9)",
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
              className="absolute right-2 z-20 grid h-11 w-11 place-items-center rounded-full text-gold transition hover:text-gold-light sm:right-6"
              style={{
                border: "1px solid rgba(212,175,55,0.45)",
                background: "rgba(8,8,10,0.9)",
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
                className="h-2.5 rounded-full transition-[width,background-color]"
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
