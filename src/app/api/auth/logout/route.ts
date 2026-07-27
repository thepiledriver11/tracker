import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/session-cookie";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName, "", { path: "/", maxAge: 0 });
  return res;
}
