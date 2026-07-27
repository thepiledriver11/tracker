import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeCron, shouldFire } from "@/lib/cron";
import { sendMessage } from "@/lib/telegram";
import { todayMessage } from "@/lib/telegram-commands";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  if (!settings.telegramChatId || !settings.notifyMorning) {
    return NextResponse.json({ skipped: "not configured" });
  }

  const { fire, today } = shouldFire(settings.morningPingAt, settings.lastMorningAt);
  if (!fire) return NextResponse.json({ skipped: "not the hour" });

  await sendMessage(settings.telegramChatId, `☀️ Good morning\n\n${await todayMessage()}`);
  await prisma.settings.update({
    where: { id: "singleton" },
    data: { lastMorningAt: today },
  });
  return NextResponse.json({ sent: true });
}
