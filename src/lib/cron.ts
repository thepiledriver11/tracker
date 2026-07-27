// DST-safe cron gate. Railway crons run hourly in UTC; each endpoint checks the
// current *Sydney* local hour against the configured time and a per-day guard,
// so the 4 Oct 2026 AEST→AEDT switch needs no crontab edits (spec §10).
import { NextResponse } from "next/server";
import { sydneyParts } from "./time";

export function authorizeCron(req: Request): NextResponse | null {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

/** True if `hhmm`'s hour matches the current Sydney hour and we haven't fired today. */
export function shouldFire(
  hhmm: string,
  lastSentDate: string | null,
): { fire: boolean; today: string } {
  const parts = sydneyParts();
  const targetHour = parseInt(hhmm.split(":")[0], 10);
  const fire = parts.hour === targetHour && lastSentDate !== parts.isoDate;
  return { fire, today: parts.isoDate };
}
