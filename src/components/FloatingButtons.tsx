"use client";

import { useEffect, useRef, useState } from "react";

export default function FloatingButtons({
  whatsappLink,
  messengerLink,
  facebookLink,
  freeVideoLink,
}: {
  whatsappLink: string;
  messengerLink: string;
  facebookLink: string;
  freeVideoLink: string;
}) {
  const [voicePosition, setVoicePosition] = useState({ x: 18, y: 180 });
  const dragRef = useRef({ sx: 0, sy: 0, x: 18, y: 180, moved: false });

  useEffect(() => {
    const saved = localStorage.getItem("mihad-ai-voice-position");
    if (saved) {
      try { setVoicePosition(JSON.parse(saved)); } catch {}
    }
  }, []);

  const startDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      sx: e.clientX,
      sy: e.clientY,
      x: voicePosition.x,
      y: voicePosition.y,
      moved: false
    };
  };

  const moveDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.moved = true;
    }

    setVoicePosition({
      x: Math.max(5, Math.min(window.innerWidth - 75, dragRef.current.x + dx)),
      y: Math.max(5, Math.min(window.innerHeight - 75, dragRef.current.y + dy))
    });
  };

  const endDrag = () => {
    localStorage.setItem(
      "mihad-ai-voice-position",
      JSON.stringify(voicePosition)
    );

    if (!dragRef.current.moved) {
      window.open(
        "https://mihad-ai-voice-o87zuck7c-primetushar325-rgbs-projects.vercel.app/",
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {freeVideoLink ? (
        <a
          href="https://mihad-free-video.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 rounded-full bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/40 transition hover:scale-105 hover:bg-red-500 animate-pulse-slow"
        >
          🎁 <span className="hidden sm:inline">Free Video</span>
        </a>
      ) : null}

      {messengerLink ? (
        <a
          href={messengerLink}
          target="_blank"
          rel="noreferrer"
          className="grid h-14 w-14 place-items-center rounded-full bg-[#0084FF] text-2xl text-white shadow-lg shadow-blue-500/40 transition hover:scale-110"
          aria-label="Messenger"
        >
          💬
        </a>
      ) : null}

      {facebookLink ? (
        <a
          href={facebookLink}
          target="_blank"
          rel="noreferrer"
          className="grid h-14 w-14 place-items-center rounded-full bg-[#1877F2] text-2xl text-white shadow-lg shadow-blue-600/40 transition hover:scale-110"
          aria-label="Facebook Support"
        >
          👍
        </a>
      ) : null}

      {whatsappLink ? (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="grid h-16 w-16 place-items-center rounded-full bg-[#25D366] text-3xl text-white shadow-xl shadow-green-500/40 transition hover:scale-110"
          aria-label="WhatsApp"
        >
          🟢
        </a>
      ) : null}
    </div>
  );
}
