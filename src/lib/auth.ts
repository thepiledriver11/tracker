// Server-side auth helpers for route handlers / server components (node runtime).
import { cookies } from "next/headers";
import { sessionCookieName, verifySession } from "./session-cookie";

/** True if the current request carries a valid session cookie. */
export async function isAuthed(): Promise<boolean> {
  const jar = await cookies();
  return verifySession(jar.get(sessionCookieName)?.value);
}

/** Throw a 401-ish sentinel used by API routes. */
export class Unauthorized extends Error {
  constructor() {
    super("Unauthorized");
  }
}

export async function requireAuth(): Promise<void> {
  if (!(await isAuthed())) throw new Unauthorized();
}
