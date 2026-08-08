"use client";

import { useRef, useState } from "react";

export default function MihadVoiceButton() {
  const [pos, setPos] = useState({ x: 18, y: 180 });
  const drag = useRef({ x: 0, y: 0, px: 18, py: 180, moved: false });

  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      px: pos.x,
      py: pos.y,
      moved: false,
    };
  };

  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      drag.current.moved = true;
    }

    setPos({
      x: Math.max(5, Math.min(window.innerWidth - 60, drag.current.px + dx)),
      y: Math.max(5, Math.min(window.innerHeight - 60, drag.current.py + dy)),
    });
  };

  const up = () => {
    if (!drag.current.moved) {
      window.open(
        "https://mihad-ai-voice-o87zuck7c-primetushar325-rgbs-projects.vercel.app/",
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  return (
    <button
      type="button"
      aria-label="Open Mihad AI Voice"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 52,
        height: 52,
        zIndex: 999999,
        borderRadius: "50%",
        border: "2px solid white",
        background: "linear-gradient(135deg,#38bdf8,#8b5cf6,#d946ef)",
        color: "white",
        boxShadow: "0 10px 30px rgba(139,92,246,.65)",
        touchAction: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>🎙️</span>
      <span style={{ fontSize: 7, marginTop: 3 }}>AI VOICE</span>
      <span style={{ fontSize: 9, letterSpacing: 1 }}>▂▅▇▅▂</span>
    </button>
  );
}
