import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensureSchema";
import { orders } from "@/db/schema";
import { rateLimit } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import { isAdminAuthed } from "@/lib/session";
import { getSettings } from "@/lib/settings";
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

/**
 * Every response from this endpoint is JSON, whatever happened. A browser that
 * gets an HTML gateway error page instead used to fall into the client's
 * generic `catch` and report "Network problem" for what was really a server
 * error — so non-JSON bodies are converted here on the way back out too.
 */
function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/** Admin order list with filtering. */
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return jsonError(401, "Unauthorized");
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
  // Short id so a customer can quote it and we can find the exact log line.
  const errorId = Math.random().toString(36).slice(2, 10);

  const contentType = req.headers.get("content-type") || "";
  const payload: Record<string, string> = {};
  let screenshot: File | null = null;
  let screenshotError = "";

  // ---- 1. parse the body (never trust it, never 500 on it) -----------------
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) {
      return jsonError(400, "We could not read the form. Please try again.");
    }
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") payload[key] = value;
    }
    const file = form.get("screenshot");
    if (file instanceof File && file.size > 0) screenshot = file;
  } else if (contentType.includes("application/json")) {
    const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!json) {
      return jsonError(400, "We could not read the request. Please try again.");
    }
    for (const [key, value] of Object.entries(json)) {
      if (value !== null && value !== undefined) payload[key] = String(value);
    }
  } else {
    return jsonError(415, "Unsupported request type. Please submit the order form again.");
  }

  // ---- 2. validate the screenshot before anything expensive ----------------
  if (screenshot) {
    if (screenshot.size > MAX_SIZE) {
      return jsonError(400, "Screenshot must be smaller than 6MB.");
    }
    if (!ALLOWED_TYPES.includes(screenshot.type)) {
      return jsonError(400, "Screenshot must be a JPG, PNG or WebP image.");
    }
  }

  // ---- 3. cheap field validation before the rate-limit budget is spent -----
  const packageId = Number(payload.packageId);
  if (!Number.isInteger(packageId) || packageId <= 0) {
    return jsonError(400, "Please choose a package before ordering.");
  }

  // ---- 4. rate limit (only real attempts reach this point) -----------------
  // A shared mobile-carrier IP can legitimately send several orders, and a
  // rejected/duplicate submit must not eat the budget of the next real one.
  if (!rateLimit(`order:${clientKey(req)}`, 30, 10 * 60 * 1000)) {
    return jsonError(
      429,
      "Too many attempts. Please wait a few minutes and try again.",
    );
  }

  await ensureSchema();

  // ---- 5. screenshot upload: best effort, must never break the order -------
  let screenshotRef: string | null = null;
  let screenshotStored = false;
  if (screenshot) {
    try {
      const uploaded = await uploadPaymentScreenshot(screenshot, "orders/");
      screenshotRef = uploaded.ref || null;
      screenshotStored = uploaded.stored !== false && Boolean(screenshotRef);
    } catch (error) {
      // Storage being down is not the customer's fault and is not a reason to
      // lose a paid order. Keep the order, flag the screenshot, tell them to
      // send it on WhatsApp.
      screenshotRef = null;
      screenshotStored = false;
      screenshotError =
        error instanceof Error ? error.message.split("\n")[0].slice(0, 200) : "unknown error";
      console.error(`[orders ${errorId}] screenshot upload failed (order continues):`, screenshotError);
    }
  }

  // ---- 6. create the order -------------------------------------------------
  try {
    const result = await createOrder({
      packageId,
      quantity: Number(payload.quantity ?? 1),
      name: payload.customerName ?? payload.name ?? "",
      phone: payload.whatsapp ?? payload.phone ?? "",
      paymentNumber: payload.paymentNumber ?? "",
      paymentMethod: payload.paymentMethod ?? "bKash",
      transactionId: payload.transactionId ?? "",
      couponCode: payload.couponCode ?? null,
      pin: payload.pin ?? null,
      note: payload.note ?? payload.customerNote ?? null,
      screenshotRef,
    });

    if (!result.ok) {
      // 5xx from createOrder means the database rejected a valid-looking order:
      // log the real reason server-side, return an honest (non-leaky) message.
      if (result.status >= 500) {
        console.error(`[orders ${errorId}] create failed (${result.code}):`, result.error);
      }
      return jsonError(result.status, result.error, {
        code: result.code,
        ...(result.status >= 500 ? { errorId } : {}),
      });
    }

    const order = result.order;
    const settings = await getSettings().catch(() => null);

    return NextResponse.json(
      {
        duplicate: result.duplicate,
        breakdown: result.breakdown,
        // The WhatsApp number comes from the settings row in the database, so
        // the client never has to invent or hard-code one.
        whatsappNumber: settings?.whatsappNumber ?? "",
        order: {
          id: order.id,
          orderCode: order.orderCode,
          customerName: order.customerName,
          packageName: order.packageName,
          packageQuantity: order.packageQuantity,
          quantity: order.quantity,
          unitPrice: Number(order.unitPrice ?? order.price),
          originalPrice: Number(order.originalPrice ?? order.price),
          discountAmount: Number(order.discountAmount ?? 0),
          couponCode: order.couponCode,
          couponDiscount: Number(order.couponDiscount ?? 0),
          price: Number(order.price),
          paymentMethod: order.paymentMethod,
          paymentNumber: order.paymentNumber,
          whatsapp: order.whatsapp,
          transactionId: order.transactionId,
          customerNote: order.customerNote ?? "",
          status: order.status,
          paymentStatus: order.paymentStatus,
          screenshotStored,
          ...(screenshotError ? { screenshotError: "upload-failed" } : {}),
          createdAt: new Date(order.createdAt).toISOString(),
        },
      },
      // 200 for "this payment already had an order" — it is not an error and
      // must not be retried as one.
      { status: result.duplicate ? 200 : 201 },
    );
  } catch (error) {
    // The real cause is logged in full; the customer gets something actionable
    // plus the error id, never a stack trace or a SQL fragment.
    console.error(`[orders ${errorId}] unexpected failure:`, error);
    return jsonError(
      500,
      "We could not save your order just now. Your payment is safe — please try again in a minute, or send your Transaction ID to us on WhatsApp.",
      { code: "internal", errorId },
    );
  }
}
