"use client";

import { useEffect, useState } from "react";

function getParts(msLeft: number) {
  const clamped = Math.max(0, msLeft);
  return {
    days: Math.floor(clamped / (1000 * 60 * 60 * 24)),
    hours: Math.floor((clamped / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((clamped / (1000 * 60)) % 60),
    seconds: Math.floor((clamped / 1000) % 60),
  };
}

export default function CountdownTimer({ endsAt }: { endsAt: string }) {
  // Clock values are only produced inside effects, never during render.
  const [endsAtMs] = useState(() => new Date(endsAt).getTime());
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(endsAtMs - Date.now());
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [endsAtMs]);

  if (remaining === null) {
    return <div className="h-[46px]" aria-hidden />;
  }

  if (remaining <= 0) return null;

  const parts = getParts(remaining);
  const units = [
    { label: "Days", value: parts.days },
    { label: "Hrs", value: parts.hours },
    { label: "Min", value: parts.minutes },
    { label: "Sec", value: parts.seconds },
  ];

  return (
    <div className="flex items-center gap-2">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="flex min-w-[52px] flex-col items-center rounded-xl border border-amber-200 bg-white px-2.5 py-1.5"
        >
          <span className="text-base font-extrabold tabular-nums text-navy">
            {String(unit.value).padStart(2, "0")}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
}
