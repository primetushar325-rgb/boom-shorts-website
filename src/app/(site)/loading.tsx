/** Route-level loading skeleton, matching the card grid used across the site. */
export default function SiteLoading() {
  return (
    <main className="min-h-screen bg-bs-bg pb-24 md:pb-12">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="bs-skeleton h-8 w-48 rounded-xl" />
        <div className="bs-skeleton mt-3 h-4 w-72 rounded-lg" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bs-skeleton h-56 rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
