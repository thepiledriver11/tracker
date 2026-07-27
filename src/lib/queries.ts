// Server-side read helpers shared across screens.
import { prisma } from "./prisma";
import { dateOnly, isoOf, sydneyDayOfWeek, sydneyISODate } from "./time";
import { num, tonnage, bestE1RM } from "./metrics";

export async function getActiveProgram() {
  return prisma.program.findFirst({
    where: { isActive: true },
    include: {
      weeks: { orderBy: { weekNumber: "asc" } },
      templates: { orderBy: { order: "asc" } },
    },
  });
}

/** The program week containing `iso` (clamped to first/last week). */
export function currentWeekOf<T extends { weekNumber: number; startDate: Date }>(
  weeks: T[],
  iso: string,
): T | null {
  if (weeks.length === 0) return null;
  const today = dateOnly(iso).getTime();
  let current = weeks[0];
  for (const w of weeks) {
    const start = w.startDate.getTime();
    const end = start + 7 * 24 * 3600 * 1000;
    if (today >= start && today < end) return w;
    if (today >= start) current = w;
  }
  return current;
}

export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

export async function getNutritionTarget(iso: string) {
  return prisma.nutritionTarget.findFirst({
    where: { effectiveFrom: { lte: dateOnly(iso) } },
    orderBy: { effectiveFrom: "desc" },
  });
}

/** Everything the Today screen needs for the given (default: today) date. */
export async function getToday(iso = sydneyISODate()) {
  const program = await getActiveProgram();
  const dow = sydneyDayOfWeek(dateOnly(iso));
  const week = program ? currentWeekOf(program.weeks, iso) : null;

  const template = program
    ? await prisma.sessionTemplate.findFirst({
        where: { programId: program.id, dayOfWeek: dow },
        include: { blocks: { include: { exercises: true } } },
      })
    : null;

  const session = template
    ? await prisma.session.findFirst({
        where: { date: dateOnly(iso), templateId: template.id },
        include: { setLogs: true },
      })
    : null;

  const [walks, nutrition, target, measurement, lastCompleted] =
    await Promise.all([
      prisma.walk.findMany({ where: { date: dateOnly(iso) } }),
      prisma.nutritionEntry.findMany({ where: { date: dateOnly(iso) } }),
      getNutritionTarget(iso),
      prisma.measurement.findUnique({ where: { date: dateOnly(iso) } }),
      prisma.session.findFirst({
        where: { completedAt: { not: null } },
        orderBy: { date: "desc" },
        include: {
          template: true,
          setLogs: true,
        },
      }),
    ]);

  const caloriesConsumed = nutrition.reduce((t, n) => t + n.calories, 0);

  const bwAvg = await sevenDayBodyweight(iso);

  let lastSummary = null as null | {
    date: string;
    name: string;
    volume: number;
    prs: number;
    e1rm: number;
  };
  if (lastCompleted) {
    const rows = lastCompleted.setLogs.map((l) => ({
      weightKg: num(l.weightKg),
      reps: l.reps,
      round: l.round,
      dropIndex: l.dropIndex,
    }));
    lastSummary = {
      date: isoOf(lastCompleted.date),
      name: lastCompleted.template?.name ?? "Session",
      volume: Math.round(tonnage(rows)),
      prs: 0,
      e1rm: Math.round(bestE1RM(rows).e1rm),
    };
  }

  return {
    iso,
    program,
    week,
    template,
    session,
    walkMinutes: walks.reduce((t, w) => t + w.minutes, 0),
    caloriesConsumed,
    target,
    bodyweight: measurement?.weightKg ? num(measurement.weightKg) : null,
    bodyweight7d: bwAvg,
    lastSummary,
    blockTarget: week?.block ?? "foundation",
  };
}

/** 7-day rolling average bodyweight ending at `iso`. */
export async function sevenDayBodyweight(iso: string): Promise<number | null> {
  const end = dateOnly(iso);
  const start = new Date(end.getTime() - 6 * 24 * 3600 * 1000);
  const rows = await prisma.measurement.findMany({
    where: { date: { gte: start, lte: end }, weightKg: { not: null } },
  });
  if (rows.length === 0) return null;
  const sum = rows.reduce((t, r) => t + num(r.weightKg), 0);
  return Math.round((sum / rows.length) * 10) / 10;
}

/** Walk minutes target for a training block (from the plan). */
export function walkTargetFor(block: string, dow: number): number {
  const isLong = dow === 7;
  if (block === "deload") return isLong ? 60 : 30;
  if (block === "overload") return isLong ? 90 : 50;
  return isLong ? 75 : 45; // foundation
}
