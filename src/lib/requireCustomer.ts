import { getCustomerSession, type CustomerSessionUser } from "./session";

export type CustomerGuard = { ok: true; customer: CustomerSessionUser } | { ok: false };

export async function requireCustomer(): Promise<CustomerSessionUser | null> {
  return getCustomerSession();
}

export async function requireCustomerGuard(): Promise<CustomerGuard> {
  const customer = await getCustomerSession();
  return customer ? { ok: true, customer } : { ok: false };
}
