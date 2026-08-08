"use client";

import { useEffect } from "react";

export default function VisitPing() {
  useEffect(() => {
    const key = "mbs_visited_session";
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch("/api/visit", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
