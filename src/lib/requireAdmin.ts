import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidSession } from "./auth";
import { getSettings } from "./settings";

export async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  const cookie = store.get(ADMIN_COOKIE)?.value;
  const s = await getSettings();
  return isValidSession(cookie, s.adminPasswordHash);
}
