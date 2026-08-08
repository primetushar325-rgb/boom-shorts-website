type Notice = { id: number; text: string };

export default function NoticeBoard({ notices }: { notices: Notice[] }) {
  if (!notices.length) return null;

  return (
    <div className="overflow-hidden border-b border-white/10 bg-gradient-to-r from-amber-500/20 via-yellow-600/20 to-amber-500/20 py-2">
      <div className="animate-marquee flex whitespace-nowrap text-sm font-medium text-amber-100">
        {[...notices, ...notices].map((n, idx) => (
          <span key={idx} className="mx-8 inline-flex items-center gap-2">
            📢 {n.text}
          </span>
        ))}
      </div>
    </div>
  );
}
