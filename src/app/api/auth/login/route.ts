import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  mintSession,
  sessionCookieName,
  sessionMaxAge,
} from "@/lib/session-cookie";

export const runtime = "nodejs";

const Body = z.object({ pin: z.string().min(1).max(32) });

export async function POST(req: Request) {
  const hash = process.env.APP_PIN_HASH;
  if (!hash) {
    return NextResponse.json(
      { error: "APP_PIN_HASH not configured" },
      { status: 500 },
    );
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const ok = await bcrypt.compare(parsed.data.pin, hash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const token = await mintSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAge,
  });
  return res;
}
