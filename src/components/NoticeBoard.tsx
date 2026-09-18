type Notice = { id: number; text: string };

export default function NoticeBoard({ notices }: { notices: Notice[] }) {
  if (!notices.length) return null;

  return (
    <div className="overflow-hidden border-b border-gold-line bg-gold-soft py-2">
      <div className="animate-marquee flex w-max whitespace-nowrap text-[13px] font-semibold text-gold-light">
        {[...notices, ...notices].map((notice, index) => (
          <span key={`${notice.id}-${index}`} className="mx-6 inline-flex items-center gap-2">
            <span aria-hidden>📢</span> {notice.text}
          </span>
        ))}
      </div>
    </div>
  );
}
