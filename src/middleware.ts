import { NextRequest, NextResponse } from "next/server";
import { sessionCookieName, verifySession } from "@/lib/session-cookie";

// Paths that never require a session cookie.
const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth/login",
  "/api/telegram/webhook", // verified by its own secret header
  "/api/cron", // verified by Bearer CRON_SECRET
];

const PUBLIC_FILES = [
  "/manifest.webmanifest",
  "/sw.js",
  "/offline.html",
  "/favicon.ico",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    PUBLIC_FILES.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return NextResponse.next();
  }

  const ok = await verifySession(req.cookies.get(sessionCookieName)?.value);
  if (ok) return NextResponse.next();

  // API calls get a 401; page navigations get redirected to the PIN screen.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
