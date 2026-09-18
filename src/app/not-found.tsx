import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="card w-full max-w-sm p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-2xl">
          🔍
        </div>
        <h1 className="mt-3 text-lg font-extrabold text-navy">Page not found</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/" className="btn-primary mt-5 w-full">
          Back to home
        </Link>
      </div>
    </main>
  );
}
