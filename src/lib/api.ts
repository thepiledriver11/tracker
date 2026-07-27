import { NextResponse } from "next/server";
import { isAuthed } from "./auth";

/** Returns a 401 response if unauthenticated, else null. Use at the top of routes. */
export async function guard(): Promise<NextResponse | null> {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function bad(msg = "Bad request") {
  return NextResponse.json({ error: msg }, { status: 400 });
}
