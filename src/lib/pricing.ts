/**
 * Single source of truth for every price the site shows or charges.
 * The server always recomputes prices from the database — the browser never
 * decides what a customer pays.
 */

export type DiscountType = "none" | "percent" | "fixed";

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeDiscountType(value: unknown): DiscountType {
  return value === "percent" || value === "fixed" ? value : "none";
}

export type PackagePricingInput = {
  oldPrice: unknown;
  newPrice: unknown;
  discountType: unknown;
  discountValue: unknown;
};

export type Pricing = {
  /** Struck-through price (always >= finalPrice) */
  originalPrice: number;
  /** What the customer actually pays for one unit */
  finalPrice: number;
  discountAmount: number;
  discountPercent: number;
};

/**
 * Resolves original price / discount type+value into one consistent price set.
 *  - percent: final = original − (original × value%)
 *  - fixed:   final = original − value
 *  - none:    final = whatever price the admin typed
 * A discount can never push the price below 0 or above the original price.
 */
export function computePackagePricing(input: PackagePricingInput): Pricing {
  const rawNew = Math.max(0, toNumber(input.newPrice, 0));
  const rawOld = Math.max(0, toNumber(input.oldPrice, 0));
  const type = normalizeDiscountType(input.discountType);
  const value = Math.max(0, toNumber(input.discountValue, 0));

  const originalPrice = rawOld > 0 ? rawOld : rawNew;

  let finalPrice = rawNew;
  if (type === "percent") {
    finalPrice = round2(originalPrice * (1 - Math.min(100, value) / 100));
  } else if (type === "fixed") {
    finalPrice = round2(Math.max(0, originalPrice - value));
  } else if (rawNew <= 0) {
    finalPrice = originalPrice;
  }

  if (finalPrice > originalPrice) finalPrice = originalPrice;
  if (finalPrice < 0) finalPrice = 0;

  const discountAmount = round2(Math.max(0, originalPrice - finalPrice));
  const discountPercent =
    originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 0;

  return { originalPrice, finalPrice, discountAmount, discountPercent };
}

/** Values that get persisted for a package (newPrice is always the final price). */
export function normalizePackagePricing(input: PackagePricingInput) {
  const type = normalizeDiscountType(input.discountType);
  const rawOld = Math.max(0, toNumber(input.oldPrice, 0));
  const rawNew = Math.max(0, toNumber(input.newPrice, 0));

  // Without an original price there is nothing to discount from.
  if (rawOld <= 0) {
    return {
      oldPrice: null as string | null,
      newPrice: round2(rawNew).toFixed(2),
      discountType: "none" as DiscountType,
      discountValue: "0.00",
    };
  }

  const value =
    type === "percent"
      ? Math.min(100, Math.max(0, toNumber(input.discountValue, 0)))
      : Math.max(0, toNumber(input.discountValue, 0));

  const pricing = computePackagePricing({
    oldPrice: rawOld,
    newPrice: rawNew,
    discountType: type,
    discountValue: value,
  });

  return {
    oldPrice: round2(pricing.originalPrice).toFixed(2),
    newPrice: round2(pricing.finalPrice).toFixed(2),
    discountType: type,
    discountValue: round2(value).toFixed(2),
  };
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------
export type CouponLike = {
  code: string;
  discountType: string;
  discountValue: unknown;
  discountPercent?: unknown;
  minOrder?: unknown;
};

export type CouponRule =
  | { ok: true; discount: number; label: string }
  | { ok: false; reason: string };

export function couponDiscount(coupon: CouponLike, amount: number): CouponRule {
  const min = Math.max(0, toNumber(coupon.minOrder, 0));
  if (amount < min) {
    return { ok: false, reason: `Minimum order ৳${min} required for this coupon` };
  }

  const type = coupon.discountType === "fixed" ? "fixed" : "percent";
  const value =
    type === "fixed"
      ? Math.max(0, toNumber(coupon.discountValue, 0))
      : Math.min(
          100,
          Math.max(0, toNumber(coupon.discountValue, toNumber(coupon.discountPercent, 0))),
        );

  if (value <= 0) return { ok: false, reason: "Coupon has no discount value" };

  const discount =
    type === "fixed" ? Math.min(value, amount) : round2((amount * value) / 100);

  if (discount <= 0) return { ok: false, reason: "Coupon has no discount value" };

  return {
    ok: true,
    discount: round2(discount),
    label: type === "fixed" ? `৳${value} off` : `${value}% off`,
  };
}

// ---------------------------------------------------------------------------
// Full order breakdown
// ---------------------------------------------------------------------------
export type OrderBreakdown = {
  quantity: number;
  unitOriginal: number;
  unitFinal: number;
  subtotal: number;
  packageDiscount: number;
  couponCode: string | null;
  couponDiscount: number;
  total: number;
};

export function computeOrderBreakdown(
  pkg: PackagePricingInput,
  quantity: number,
  coupon: (CouponLike & { discount: number }) | null,
): OrderBreakdown {
  const qty = Math.min(20, Math.max(1, Math.floor(quantity) || 1));
  const pricing = computePackagePricing(pkg);

  const subtotal = round2(pricing.originalPrice * qty);
  const packageDiscount = round2(pricing.discountAmount * qty);
  const afterPackage = round2(pricing.finalPrice * qty);
  const couponDiscount = coupon ? Math.min(round2(coupon.discount), afterPackage) : 0;

  return {
    quantity: qty,
    unitOriginal: pricing.originalPrice,
    unitFinal: pricing.finalPrice,
    subtotal,
    packageDiscount,
    couponCode: coupon?.code ?? null,
    couponDiscount,
    total: round2(Math.max(0, afterPackage - couponDiscount)),
  };
}
