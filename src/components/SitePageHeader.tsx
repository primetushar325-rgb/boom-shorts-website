import Link from "next/link";

export default function SitePageHeader({
  title,
  subtitle,
  backHref = "/",
  backLabel = "Home",
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600"
        >
          <span aria-hidden>←</span> {backLabel}
        </Link>
        <h1 className="mt-2 text-lg font-extrabold text-navy sm:text-xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-xs text-slate-500 sm:text-[13px]">{subtitle}</p> : null}
      </div>
    </div>
  );
}
