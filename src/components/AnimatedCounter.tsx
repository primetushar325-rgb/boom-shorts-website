"use client";

import { useEffect, useRef } from "react";

/**
 * Count-up statistic.
 *
 * Two things were wrong with the previous version:
 *  1. it pulled in `framer-motion` (~40 KB of client JS) for a single fade-in,
 *     shipped to every phone that opens the homepage;
 *  2. it called `setState` on every animation frame — ~84 React re-renders per
 *     counter over 1.4 s, three counters in the hero, all on the main thread
 *     while the user is already scrolling.
 *
 * It now writes straight to a DOM text node (no React render per frame) and uses
 * one `IntersectionObserver`. The final value is what the server renders, so
 * there is no hydration mismatch and the number is still correct with JavaScript
 * disabled or under `prefers-reduced-motion`.
 */
export default function AnimatedCounter({ value }: { value: string }) {
  const numberRef = useRef<HTMLSpanElement>(null);

  const numeric = parseInt(value.replace(/[^\d]/g, ""), 10) || 0;
  const suffix = value.replace(/[\d,]/g, "");
  const finalText = numeric.toLocaleString("en-US");

  useEffect(() => {
    const node = numberRef.current;
    if (!node || numeric <= 0) return;

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") return;

    let frame = 0;
    let started = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || started) return;
        started = true;
        observer.disconnect();

        const duration = 1400;
        const start = performance.now();
        node.textContent = "0";

        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          // Direct DOM write — deliberately not React state.
          node.textContent = Math.round(numeric * eased).toLocaleString("en-US");
          if (progress < 1) frame = requestAnimationFrame(tick);
          else node.textContent = finalText;
        };
        frame = requestAnimationFrame(tick);
      },
      { rootMargin: "-40px 0px" },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      // Never leave a half-counted value behind if the component unmounts.
      node.textContent = finalText;
    };
  }, [numeric, finalText]);

  return (
    <span className="animate-fade-in-up inline-block tabular-nums">
      <span ref={numberRef}>{finalText}</span>
      {suffix}
    </span>
  );
}
