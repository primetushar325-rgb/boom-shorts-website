import Link from "next/link";
import BrandLogo from "./BrandLogo";

/**
 * Shared header for the inner site pages (checkout, orders, profile, …).
 *
 * The back control is a single, fully clickable button that always shows the
 * word "Back" next to the arrow — never an arrow on its own.
 */
export default function SitePageHeader({
  title,
  subtitle,
  backHref = "/",
  backLabel = "Back",
  logoUrl,
  siteName = "Boom Shorts",
  showLogo = false,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  logoUrl?: string;
  siteName?: string;
  showLogo?: boolean;
}) {
  return (
    <div
      className="border-b"
      style={{
        borderColor: "rgba(212,175,55,0.2)",
        background: "linear-gradient(180deg,#0b0b0d 0%,#050505 100%)",
      }}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
        {showLogo ? (
          <Link href="/" aria-label={siteName} className="shrink-0">
            <BrandLogo src={logoUrl || "/logo.png"} alt={siteName} size={60} priority />
          </Link>
        ) : null}

        <div className="min-w-0 flex-1">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gold transition hover:text-gold-light"
            style={{
              border: "1px solid rgba(212,175,55,0.38)",
              background: "rgba(212,175,55,0.07)",
            }}
          >
            <span aria-hidden>←</span> {backLabel}
          </Link>
          <h1 className="mt-2 text-lg font-extrabold text-warm sm:text-xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-xs text-muted sm:text-[13px]">{subtitle}</p> : null}
        </div>
      </div>
    </div>
  );
}
