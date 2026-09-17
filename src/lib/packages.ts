import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { packageFeatures, packages } from "@/db/schema";
import type { PackageCardData } from "@/components/site/PackageCard";

/**
 * Package reads for the customer website.
 *
 * Homepage ordering, visibility and availability all come from the database,
 * so an admin change is reflected on the next request with no redeploy.
 */

/** Packages shown on the homepage, in the admin-controlled order. */
export async function getHomepagePackages(category?: "boom" | "service") {
  const rows = await db
    .select()
    .from(packages)
    .where(eq(packages.archived, false))
    .orderBy(asc(packages.sortOrder), asc(packages.id));

  const filtered = category ? rows.filter((p) => p.category === category) : rows;
  const visible = filtered.filter((p) => p.visible);

  return withFeatures(visible);
}

/** All non-archived packages, including hidden ones (admin views). */
export async function getAllPackages() {
  const rows = await db
    .select()
    .from(packages)
    .where(eq(packages.archived, false))
    .orderBy(asc(packages.sortOrder), asc(packages.id));
  return withFeatures(rows);
}

export async function getPackageById(id: number) {
  const rows = await db
    .select()
    .from(packages)
    .where(eq(packages.id, id))
    .limit(1);
  const pkg = rows[0];
  if (!pkg || pkg.archived) return null;
  const [withFeat] = await withFeatures([pkg]);
  return withFeat;
}

/** Attaches ordered feature labels to package rows in one extra query. */
export async function withFeatures<T extends { id: number }>(rows: T[]): Promise<(T & { features: string[] })[]> {
  if (rows.length === 0) return [];

  const feats = await db
    .select({
      packageId: packageFeatures.packageId,
      label: packageFeatures.label,
      sortOrder: packageFeatures.sortOrder,
    })
    .from(packageFeatures)
    .where(inArray(packageFeatures.packageId, rows.map((r) => r.id)))
    .orderBy(asc(packageFeatures.sortOrder), asc(packageFeatures.id));

  const grouped = new Map<number, string[]>();
  for (const f of feats) {
    const list = grouped.get(f.packageId) ?? [];
    list.push(f.label);
    grouped.set(f.packageId, list);
  }

  return rows.map((r) => ({ ...r, features: grouped.get(r.id) ?? [] }));
}

/** Narrow shape consumed by PackageCard. */
export function toCardData(pkg: {
  id: number;
  name: string;
  shortDescription: string;
  description: string;
  durationLabel: string;
  videoQuantity: number;
  newPrice: string;
  oldPrice: string | null;
  discountPercent: number;
  discountAmount: string;
  isBestSeller: boolean;
  badge: string;
  available: boolean;
  features: string[];
}): PackageCardData {
  return {
    id: pkg.id,
    name: pkg.name,
    shortDescription: pkg.shortDescription,
    description: pkg.description,
    durationLabel: pkg.durationLabel,
    videoQuantity: pkg.videoQuantity,
    newPrice: pkg.newPrice,
    oldPrice: pkg.oldPrice,
    discountPercent: pkg.discountPercent,
    discountAmount: pkg.discountAmount,
    isBestSeller: pkg.isBestSeller,
    badge: pkg.badge,
    available: pkg.available,
    features: pkg.features,
  };
}
