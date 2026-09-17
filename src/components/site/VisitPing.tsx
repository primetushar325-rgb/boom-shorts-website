"use client";

import { useEffect, useRef } from "react";

/**
 * Counts one visit per browser session.
 * The write is fire-and-forget and throttled by sessionStorage so reloads do
 * not hammer the settings row.
 */
export default function VisitPing() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    const key = "bs_visited_session";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    sent.current = true;
    fetch("/api/visit", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
