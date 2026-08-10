// Edge-compatible (Web Crypto) auth helpers. Single shared password from
// APP_PASSWORD; the session cookie holds a hash derived from it, so changing
// the password invalidates existing sessions.

export const AUTH_COOKIE = "gt_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 365; // stay signed in for a year

export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`goal-tracker:v1:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
