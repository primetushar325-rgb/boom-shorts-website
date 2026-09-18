import { NextResponse } from "next/server";
import { ensureSchema } from "@/db/ensureSchema";
import { getCustomerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSchema();
  const customer = await getCustomerSession();
  return NextResponse.json({
    customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone } : null,
  });
}
