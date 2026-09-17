"use client";

import { useEffect, useState } from "react";

type Parts = { d: number; h: number; m: number; s: number };

function getParts(remaining: number): Parts {
  const clamped = Math.max(0, remaining);
  return {
    d: Math.floor(clamped / 86_400_000),
    h: Math.floor((clamped / 3_600_000) % 24),
    m: Math.floor((clamped / 60_000) % 60),
    s: Math.floor((clamped / 1000) % 60),
  };
}

/**
 * Live offer countdown.
 *
 * The initial value is computed inside an effect rather than during render so
 * the server and client render the same markup (no hydration mismatch and no
 * impure `Date.now()` call in the render body).
 */
export default function CountdownTimer({ endsAt }: { endsAt: string }) {
  const target = new Date(endsAt).getTime();
  const [parts, setParts] = useState<Parts>({ d: 0, h: 0, m: 0, s: 0 });
  const [expired, setExpired] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const update = () => {
      const remaining = target - Date.now();
      setExpired(remaining <= 0);
      setParts(getParts(remaining));
      setReady(true);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (!ready) return <div className="h-14" />;
  if (expired) {
    return <p className="text-sm font-semibold text-bs-muted">This offer has ended.</p>;
  }

  const cells: [string, number][] = [
    ["Days", parts.d],
    ["Hours", parts.h],
    ["Min", parts.m],
    ["Sec", parts.s],
  ];

  return (
    <div className="flex items-center justify-center gap-2">
      {cells.map(([label, n]) => (
        <div
          key={label}
          className="min-w-14 rounded-xl border border-bs-line bg-white px-2 py-1.5 text-center"
        >
          <span className="block text-lg font-extrabold tabular-nums text-bs-ink">
            {String(n).padStart(2, "0")}
          </span>
          <span className="block text-[9px] font-semibold uppercase tracking-wide text-bs-muted">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
