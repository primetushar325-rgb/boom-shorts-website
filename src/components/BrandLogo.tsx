import Image from "next/image";

/**
 * BOOM SHORTS brand mark.
 *
 * Uses the existing /logo.png asset (1254×1254, already black + gold) and adds
 * the premium motion:
 *   • `logo-breathe` — glow rises, holds, fades, then rests (7s cycle)
 *   • `logo-glint`   — a single light glint crosses the mark once per cycle
 * Both stop completely under `prefers-reduced-motion: reduce`.
 *
 * next/image resizes the large source down to the rendered size, so the header
 * no longer ships a 640KB image for a small mark.
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
      className={`logo-breathe logo-glint relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full ${className}`}
      style={{
        width: size,
        height: size,
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
  );
}
