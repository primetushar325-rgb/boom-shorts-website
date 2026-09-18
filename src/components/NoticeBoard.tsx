import { Megaphone } from "lucide-react";

type Notice = { id: number; text: string };

/**
 * Notice board.
 *
 * This used to be an infinite CSS marquee (`animation: marquee 32s linear
 * infinite`). A never-ending horizontal animation keeps the compositor busy for
 * as long as the page is open and, sitting directly under a sticky header, it
 * was one of the things that made vertical scrolling on Android feel like it was
 * fighting the page.
 *
 * The notices are now a static, wrapped row of chips: same information, same
 * gold styling, zero animation and zero JavaScript.
 */
export default function NoticeBoard({ notices }: { notices: Notice[] }) {
  if (!notices.length) return null;

  return (
    <div className="border-b border-gold-line bg-gold-soft">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2">
        {notices.map((notice) => (
          <p
            key={notice.id}
            className="flex min-w-0 items-start gap-1.5 text-[13px] font-semibold leading-snug text-gold-light"
          >
            <Megaphone size={13} className="mt-0.5 shrink-0" aria-hidden />
            <span className="min-w-0">{notice.text}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
