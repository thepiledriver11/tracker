import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  // No password configured → app is open (e.g. local dev).
  if (!password) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const valid = token === (await authToken(password));

  if (pathname === "/login" || pathname === "/api/login") {
    if (valid && pathname === "/login") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (valid) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Everything except Next internals and the public icon/manifest assets.
    "/((?!_next|icon\\.svg|apple-icon\\.png|icon-192\\.png|icon-512\\.png|manifest\\.webmanifest|favicon\\.ico).*)",
  ],
};
