import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdminJson } from "@/lib/requireAdmin";

/**
 * Shared plumbing for the admin CRUD routes.
 *
 * The original routes spread the raw request body straight into
 * `db.update().set(...)`, which let a client write any column. Every patch now
 * goes through an explicit allowlist with per-field coercion.
 */

export type Coercer = (value: unknown) => unknown;

export const asText =
  (max = 5000): Coercer =>
  (v) =>
    v === null || v === undefined ? "" : String(v).slice(0, max);

export const asInt =
  (fallback = 0): Coercer =>
  (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
  };

export const asNumeric = (): Coercer => (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n.toFixed(2) : "0.00";
};

export const asBool =
  (fallback = false): Coercer =>
  (v) =>
    typeof v === "boolean" ? v : v === "true" || v === 1 || v === "1" ? true : fallback;

export const asDateOrNull = (): Coercer => (v) => {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};

export const asStringArray = (): Coercer => (v) =>
  Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean).slice(0, 20) : [];

export type FieldSpec = Record<string, Coercer>;

/** Builds a validated patch object, dropping anything not in the allowlist. */
export function buildPatch(body: Record<string, unknown>, spec: FieldSpec): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, coerce] of Object.entries(spec)) {
    if (!(key in body)) continue;
    patch[key] = coerce(body[key]);
  }
  return patch;
}

export async function adminDelete(table: any, id: number): Promise<NextResponse> {
  const guard = await requireAdminJson();
  if (!guard.ok) return guard.response;
  await db.delete(table).where(eq(table.id, id));
  return NextResponse.json({ ok: true });
}

export async function adminPatch(
  table: any,
  id: number,
  patch: Record<string, unknown>,
  key = "row",
): Promise<NextResponse> {
  const guard = await requireAdminJson();
  if (!guard.ok) return guard.response;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const [updated] = await db.update(table).set(patch).where(eq(table.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ [key]: updated });
}

export async function adminInsert(table: any, values: Record<string, unknown>, key = "row") {
  const guard = await requireAdminJson();
  if (!guard.ok) return { guard, created: null as any };
  const inserted = (await db.insert(table).values(values).returning()) as unknown[];
  return { guard, created: inserted[0] ?? null };
}

/** Applies an explicit ordering, e.g. drag-and-drop reorder results. */
export async function applySortOrder(
  table: any,
  orderedIds: number[],
): Promise<number> {
  let count = 0;
  for (let i = 0; i < orderedIds.length; i++) {
    const id = Number(orderedIds[i]);
    if (!Number.isFinite(id)) continue;
    await db.update(table).set({ sortOrder: i }).where(eq(table.id, id));
    count++;
  }
  return count;
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export { sql };
