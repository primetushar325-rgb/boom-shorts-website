import Image from "next/image";

/**
 * BOOM SHORTS brand mark.
 *
 * Uses the existing /logo.png asset (already black + gold) and keeps the
 * premium motion:
 *   • `.logo-glow`  — the breathing gold halo (7s cycle)
 *   • `logo-glint`  — a single light glint crosses the mark once per cycle
 *
 * Both animate ONLY `opacity` / `transform`, so they run on the compositor and
 * never repaint while the user scrolls (the previous version animated
 * `filter: drop-shadow() brightness()` on a sticky header, which repainted
 * every frame). Both stop completely under `prefers-reduced-motion: reduce`.
 *
 * The wrapper has an explicit width/height, so the mark can never shift the
 * header layout while the image loads.
 */
export default function BrandLogo({
  src,
  alt,
  size = 52,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  const source = (src || "").trim() || "/logo.png";

  return (
    <span
      data-logo
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* animated halo — the only thing that moves */}
      <span className="logo-glow" aria-hidden />

      <span
        className="logo-glint relative grid h-full w-full place-items-center overflow-hidden rounded-full"
        style={{
          background: "radial-gradient(circle at 50% 42%, #14120c 0%, #050505 72%)",
          boxShadow:
            "inset 0 0 0 1px rgba(212,175,55,0.45), 0 0 22px -8px rgba(212,175,55,0.55)",
        }}
      >
        <Image
          src={source}
          alt={alt}
          width={size}
          height={size}
          priority={priority}
          sizes={`${size}px`}
          className="h-full w-full rounded-full object-cover"
        />
      </span>
    </span>
  );
}
