/**
 * Lightweight skeleton shown while a streamed (Suspense) homepage section
 * loads. Keeps layout stable so the page does not jump, and carries no client
 * JavaScript.
 */
export default function SectionFallback({
  title,
  compact = false,
}: {
  title: string;
  compact?: boolean;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14" aria-busy="true">
      <div className="mb-6 text-center">
        <h2 className="section-title">{title}</h2>
      </div>
      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"}`}>
        {Array.from({ length: compact ? 3 : 4 }).map((_, index) => (
          <div
            key={index}
            className="animate-fade-in rounded-2xl"
            style={{
              height: compact ? 56 : 150,
              border: "1px solid rgba(212,175,55,0.12)",
              background: "linear-gradient(180deg,#121214 0%,#0b0b0d 100%)",
            }}
          />
        ))}
      </div>
    </section>
  );
}
