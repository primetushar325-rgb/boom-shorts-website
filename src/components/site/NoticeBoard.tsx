export default function NoticeBoard({ notices }: { notices: { id: number; text: string }[] }) {
  if (!notices.length) return null;
  const loop = [...notices, ...notices];

  return (
    <div className="overflow-hidden border-y border-bs-line bg-bs-primary-soft py-2">
      <div className="animate-bs-marquee flex w-max gap-10 whitespace-nowrap">
        {loop.map((n, i) => (
          <span
            key={`${n.id}-${i}`}
            className="flex items-center gap-2 text-xs font-semibold text-bs-primary-dark"
          >
            📢 {n.text}
          </span>
        ))}
      </div>
    </div>
  );
}
