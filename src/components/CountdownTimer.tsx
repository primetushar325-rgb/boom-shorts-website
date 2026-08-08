"use client";

import { useEffect, useState } from "react";

function getParts(msLeft: number) {
  const clamped = Math.max(0, msLeft);
  const days = Math.floor(clamped / (1000 * 60 * 60 * 24));
  const hours = Math.floor((clamped / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((clamped / (1000 * 60)) % 60);
  const seconds = Math.floor((clamped / 1000) % 60);
  return { days, hours, minutes, seconds };
}

export default function CountdownTimer({ endsAt }: { endsAt: string }) {
  const target = new Date(endsAt).getTime();
  const [parts, setParts] = useState(() => getParts(target - Date.now()));
  const [expired, setExpired] = useState(target - Date.now() <= 0);

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = target - Date.now();
      setParts(getParts(diff));
      if (diff <= 0) setExpired(true);
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (expired) return null;

  const units = [
    { label: "Days", value: parts.days },
    { label: "Hrs", value: parts.hours },
    { label: "Min", value: parts.minutes },
    { label: "Sec", value: parts.seconds },
  ];

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {units.map((u) => (
        <div
          key={u.label}
          className="flex min-w-[56px] flex-col items-center rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-md"
        >
          <span className="text-lg font-bold tabular-nums text-white sm:text-xl">
            {String(u.value).padStart(2, "0")}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-white/70">{u.label}</span>
        </div>
      ))}
    </div>
  );
}
