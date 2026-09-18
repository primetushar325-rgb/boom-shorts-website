import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="card w-full max-w-sm p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold-soft text-gold">
          <FileQuestion size={22} aria-hidden />
        </div>
        <h1 className="mt-3 text-lg font-extrabold text-warm">Page not found</h1>
        <p className="mt-1.5 text-sm text-muted">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/" className="btn-primary mt-5 w-full">
          Back to home
        </Link>
      </div>
    </main>
  );
}
