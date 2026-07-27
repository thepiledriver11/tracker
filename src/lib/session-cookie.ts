// Signed session cookie via jose (HS256). Edge-safe so middleware can verify it.
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "tt_session";
const NINETY_DAYS_S = 90 * 24 * 60 * 60;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short (need 32+ bytes).");
  }
  return new TextEncoder().encode(s);
}

export const sessionCookieName = COOKIE_NAME;
export const sessionMaxAge = NINETY_DAYS_S;

/** Mint a signed session token. */
export async function mintSession(): Promise<string> {
  return new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${NINETY_DAYS_S}s`)
    .sign(secret());
}

/** True if the token is a valid, unexpired session. */
export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}
