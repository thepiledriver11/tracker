import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeCron, shouldFire } from "@/lib/cron";
import { sendMessage } from "@/lib/telegram";
import { num } from "@/lib/metrics";
import { sydneyParts, sydneyISODate, dateOnly } from "@/lib/time";
import { getActiveProgram, currentWeekOf, getNutritionTarget } from "@/lib/queries";

export const runtime = "nodejs";

// Sunday evening week recap.
export async function POST(req: Request) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  if (!settings.telegramChatId || !settings.notifyRecap) {
    return NextResponse.json({ skipped: "not configured" });
  }

  const parts = sydneyParts();
  if (parts.dayOfWeek !== settings.weeklyRecapDay) {
    return NextResponse.json({ skipped: "not recap day" });
  }
  const { fire, today } = shouldFire("19:00", settings.lastRecapAt);
  if (!fire) return NextResponse.json({ skipped: "not the hour" });

  const program = await getActiveProgram();
  const week = program ? currentWeekOf(program.weeks, sydneyISODate()) : null;
  const start = week ? week.startDate : dateOnly(sydneyISODate());
  const end = new Date(start.getTime() + 7 * 86400000);
  const prevStart = new Date(start.getTime() - 7 * 86400000);

  const [sessions, walkAgg, nutrition, bwThis, bwPrev, target] = await Promise.all([
    prisma.session.count({ where: { completedAt: { not: null }, date: { gte: start, lt: end } } }),
    prisma.walk.aggregate({ _sum: { minutes: true }, where: { date: { gte: start, lt: end } } }),
    prisma.nutritionEntry.findMany({ where: { date: { gte: start, lt: end } } }),
    prisma.measurement.findMany({ where: { date: { gte: start, lt: end }, weightKg: { not: null } } }),
    prisma.measurement.findMany({ where: { date: { gte: prevStart, lt: start }, weightKg: { not: null } } }),
    getNutritionTarget(sydneyISODate()),
  ]);

  const days = new Set(nutrition.map((n) => n.date.toISOString().slice(0, 10))).size || 1;
  const avgCals = Math.round(nutrition.reduce((t, n) => t + n.calories, 0) / days);
  const avgProtein = Math.round(nutrition.reduce((t, n) => t + (n.proteinG ?? 0), 0) / days);
  const avg = (rows: { weightKg: unknown }[]) =>
    rows.length ? rows.reduce((t, r) => t + num(r.weightKg), 0) / rows.length : null;
  const bwNow = avg(bwThis);
  const bwWas = avg(bwPrev);
  const bwDelta = bwNow != null && bwWas != null ? Math.round((bwNow - bwWas) * 10) / 10 : null;

  const lines = [
    `📊 <b>Week ${week?.weekNumber ?? "?"} recap</b>`,
    `Sessions ${sessions}/6`,
    `Walk ${walkAgg._sum.minutes ?? 0} min`,
    `Avg ${avgCals} kcal${target ? ` (target ${target.calories})` : ""} · ${avgProtein}g protein`,
    bwDelta != null ? `Bodyweight ${bwDelta > 0 ? "+" : ""}${bwDelta} kg vs last week` : "Bodyweight — log to track",
  ];

  await sendMessage(settings.telegramChatId, lines.join("\n"));
  await prisma.settings.update({ where: { id: "singleton" }, data: { lastRecapAt: today } });
  return NextResponse.json({ sent: true });
}
