import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeCron, shouldFire } from "@/lib/cron";
import { sendMessage } from "@/lib/telegram";
import { dateOnly, sydneyISODate, sydneyDayOfWeek } from "@/lib/time";
import { getActiveProgram } from "@/lib/queries";

export const runtime = "nodejs";

// Evening nudge — only if a scheduled session or walk is still unlogged.
export async function POST(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  if (!settings.telegramChatId || !settings.notifyNudge) {
    return NextResponse.json({ skipped: "not configured" });
  }
  const { fire, today } = shouldFire(settings.eveningNudgeAt, settings.lastNudgeAt);
  if (!fire) return NextResponse.json({ skipped: "not the hour" });

  const iso = sydneyISODate();
  const date = dateOnly(iso);
  const dow = sydneyDayOfWeek(date);
  const program = await getActiveProgram();
  const template = program
    ? await prisma.sessionTemplate.findFirst({ where: { programId: program.id, dayOfWeek: dow } })
    : null;

  const sessionDone = template
    ? await prisma.session.findFirst({ where: { date, templateId: template.id, completedAt: { not: null } } })
    : null;
  const walkDone = await prisma.walk.findFirst({ where: { date } });

  let msg: string | null = null;
  if (template && !sessionDone) msg = `Evening check — ${template.name} still to log.`;
  else if (!walkDone && dow !== 3 && dow !== 6) msg = "Evening check — walk not logged yet.";

  // Always record the guard so we only evaluate once per day.
  await prisma.settings.update({ where: { id: "singleton" }, data: { lastNudgeAt: today } });

  if (!msg) return NextResponse.json({ skipped: "all logged" });
  await sendMessage(settings.telegramChatId, msg);
  return NextResponse.json({ sent: true });
}
