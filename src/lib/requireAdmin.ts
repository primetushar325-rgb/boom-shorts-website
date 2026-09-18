import { isAdminAuthed } from "./session";

/**
 * Admin authorization gate for server components and route handlers.
 * Full verification happens server-side (signed session cookie + current admin
 * password hash) — hiding a button in the UI is never the protection.
 */
export { isAdminAuthed };

export async function requireAdminResponse(): Promise<Response | null> {
  const authed = await isAdminAuthed();
  if (authed) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
