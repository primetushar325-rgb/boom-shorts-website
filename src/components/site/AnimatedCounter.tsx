"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Counts up to the numeric part of a stat like "10K+" the first time it
 * scrolls into view. Non-numeric values render unchanged.
 */
export default function AnimatedCounter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
  const target = match ? Number(match[1]) : null;
  const suffix = match ? match[2] : "";

  const [display, setDisplay] = useState(target === null ? value : `0${suffix}`);

  useEffect(() => {
    if (target === null || !inView) return;
    let frame = 0;
    const total = 28;
    const tick = () => {
      frame += 1;
      const progress = frame / total;
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      setDisplay(`${target % 1 === 0 ? Math.round(current) : current.toFixed(1)}${suffix}`);
      if (frame < total) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, suffix]);

  if (target === null) return <span>{value}</span>;

  return (
    <motion.span ref={ref} className="tabular-nums">
      {display}
    </motion.span>
  );
}
