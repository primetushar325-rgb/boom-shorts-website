import Link from "next/link";

export default function SiteNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-bs-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-bs-line bg-white p-8 text-center shadow-bs-card">
        <p className="text-4xl">🔍</p>
        <h1 className="mt-3 text-lg font-extrabold text-bs-ink">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-bs-muted">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-bs-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-bs-primary-dark"
          >
            Back to Home
          </Link>
          <Link
            href="/orders"
            className="rounded-xl border border-bs-line px-5 py-2.5 text-sm font-bold text-bs-ink transition hover:border-bs-primary/40"
          >
            My Orders
          </Link>
        </div>
      </div>
    </main>
  );
}
