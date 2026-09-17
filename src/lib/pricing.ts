/**
 * Single source of truth for money.
 *
 * Rules:
 *  - Prices are stored as numeric(10,2) and arrive from Drizzle as strings.
 *  - The customer website NEVER computes or sends a price. The server derives
 *    the final amount from the database row and stamps it on the order.
 *  - Everything is rounded to whole taka for display, and to 2dp internally.
 */

export type PriceInput = {
  /** Base price — packages.new_price */
  newPrice: string | number | null | undefined;
  /** Optional strikethrough "was" price — packages.old_price */
  oldPrice?: string | number | null;
  discountPercent?: number | null;
  discountAmount?: string | number | null;
};

export type PriceBreakdown = {
  /** Base price before any discount */
  base: number;
  /** Absolute discount actually applied, in taka */
  discount: number;
  /** What the customer pays */
  final: number;
  /** Strikethrough price to render (0 = do not render) */
  strikeThrough: number;
  /** Percentage off, for the "-20%" pill (0 = do not render) */
  percentOff: number;
};

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Round to 2 decimal places, avoiding floating point drift. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Absolute discount for a package.
 * An explicit taka amount wins over a percentage; a percentage is rounded to
 * whole taka so "10% of 400" is exactly 40 and never 40.000000001.
 */
export function packageDiscount(input: PriceInput): number {
  const base = toNumber(input.newPrice);
  const amount = toNumber(input.discountAmount);
  if (amount > 0) return round2(Math.min(amount, base));

  const percent = toNumber(input.discountPercent);
  if (percent > 0) return round2(Math.min(base, (base * Math.min(percent, 100)) / 100));

  return 0;
}

/** Full breakdown used by cards, checkout and the order writer. */
export function priceBreakdown(input: PriceInput): PriceBreakdown {
  const base = round2(toNumber(input.newPrice));
  const discount = Math.min(packageDiscount(input), base);
  const final = round2(Math.max(0, base - discount));

  const explicitOld = toNumber(input.oldPrice);
  const strikeThrough = explicitOld > final ? round2(explicitOld) : discount > 0 ? base : 0;

  const percentOff =
    strikeThrough > final && strikeThrough > 0
      ? Math.round(((strikeThrough - final) / strikeThrough) * 100)
      : 0;

  return { base, discount, final, strikeThrough, percentOff };
}

/** Convenience: just the amount the customer pays for a package. */
export function finalPriceOf(input: PriceInput): number {
  return priceBreakdown(input).final;
}

/**
 * Coupon discount applied on top of the package discount.
 * Mirrors `coupons` columns; a taka amount wins over a percentage.
 */
export function couponDiscount(opts: {
  base: number;
  discountPercent?: number | null;
  discountAmount?: string | number | null;
}): number {
  const base = round2(toNumber(opts.base));
  const amount = toNumber(opts.discountAmount);
  if (amount > 0) return round2(Math.min(amount, base));

  const percent = toNumber(opts.discountPercent);
  if (percent > 0) return round2(Math.min(base, (base * Math.min(percent, 100)) / 100));

  return 0;
}

/** "৳400" — no decimals for whole numbers, 2dp when there is a fraction. */
export function taka(value: number | string | null | undefined): string {
  const n = toNumber(value);
  const isWhole = Math.abs(n - Math.round(n)) < 0.005;
  const formatted = isWhole
    ? Math.round(n).toLocaleString("en-US")
    : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `৳${formatted}`;
}
