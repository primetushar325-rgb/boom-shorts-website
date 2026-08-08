import { notFound } from "next/navigation";
import { db } from "@/db";
import { packages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import PaymentForm from "./PaymentForm";

export const dynamic = "force-dynamic";

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = Number(id);
  if (Number.isNaN(idNum)) notFound();

  const rows = await db.select().from(packages).where(eq(packages.id, idNum)).limit(1);
  const pkg = rows[0];
  if (!pkg) notFound();

  const s = await getSettings();

  return (
    <PaymentForm
      pkg={{ id: pkg.id, name: pkg.name, price: pkg.newPrice }}
      settings={{
        siteName: s.siteName,
        whatsappNumber: s.whatsappNumber,
        bkashNumber: s.bkashNumber,
        nagadNumber: s.nagadNumber,
        rocketNumber: s.rocketNumber,
        qrCodeUrl: s.qrCodeUrl,
        paymentNotice: s.paymentNotice,
      }}
    />
  );
}
