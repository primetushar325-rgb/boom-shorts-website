import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { orders } from "@/db/schema";
import { rateLimit } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import { isAdminAuthed } from "@/lib/session";
import { uploadPaymentScreenshot } from "@/lib/storage";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE = 6 * 1024 * 1024;

function clientKey(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Admin order list with filtering. */
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const status = req.nextUrl.searchParams.get("status");
  const search = (req.nextUrl.searchParams.get("q") || "").trim();

  const filters: SQL[] = [];
  if (status && status !== "all") filters.push(eq(orders.status, status));
  if (search) {
    const like = `%${search}%`;
    const searchFilter = or(
      ilike(orders.customerName, like),
      ilike(orders.whatsapp, like),
      ilike(orders.packageName, like),
      ilike(orders.transactionId, like),
      ilike(orders.orderCode, like),
    );
    if (searchFilter) filters.push(searchFilter);
  }

  const rows = await db
    .select()
    .from(orders)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(200);

  return NextResponse.json({ orders: rows });
}

/** Public endpoint: create an order (multipart so the screenshot can be attached). */
export async function POST(req: NextRequest) {
  await ensureSchema();

  if (!rateLimit(`order:${clientKey(req)}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const contentType = req.headers.get("content-type") || "";
  const payload: Record<string, string> = {};
  let screenshot: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") payload[key] = value;
    }
    const file = form.get("screenshot");
    if (file instanceof File && file.size > 0) screenshot = file;
  } else {
    const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    for (const [key, value] of Object.entries(json)) {
      if (value !== null && value !== undefined) payload[key] = String(value);
    }
  }

  if (screenshot) {
    if (screenshot.size > MAX_SIZE) {
      return NextResponse.json({ error: "Screenshot must be smaller than 6MB." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(screenshot.type)) {
      return NextResponse.json(
        { error: "Screenshot must be a JPG, PNG or WebP image." },
        { status: 400 },
      );
    }
  }

  let screenshotRef: string | null = null;
  try {
    if (screenshot) {
      const uploaded = await uploadPaymentScreenshot(screenshot, "orders/");
      screenshotRef = uploaded.ref;
    }

    const result = await createOrder({
      packageId: Number(payload.packageId),
      quantity: Number(payload.quantity ?? 1),
      name: payload.customerName ?? payload.name ?? "",
      phone: payload.whatsapp ?? payload.phone ?? "",
      paymentNumber: payload.paymentNumber ?? "",
      paymentMethod: payload.paymentMethod ?? "bKash",
      transactionId: payload.transactionId ?? "",
      couponCode: payload.couponCode ?? null,
      pin: payload.pin ?? null,
      screenshotRef,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const order = result.order;
    return NextResponse.json(
      {
        duplicate: result.duplicate,
        order: {
          id: order.id,
          orderCode: order.orderCode,
          packageName: order.packageName,
          quantity: order.quantity,
          price: Number(order.price),
          paymentMethod: order.paymentMethod,
          transactionId: order.transactionId,
          status: order.status,
          paymentStatus: order.paymentStatus,
          createdAt: new Date(order.createdAt).toISOString(),
        },
      },
      { status: result.duplicate ? 200 : 201 },
    );
  } catch (error) {
    console.error("[orders] create failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Something went wrong while saving your order. Please try again." },
      { status: 500 },
    );
  }
}
