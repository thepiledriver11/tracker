import { prisma } from "./prisma";
import { num } from "./metrics";
import { dateOnly, isoOf, sydneyISODate } from "./time";
import { getNutritionTarget } from "./queries";

export async function getBodyData(iso = sydneyISODate()) {
  const today = dateOnly(iso);

  const [measurements, todayEntries, shortcuts, target, weekEntries] =
    await Promise.all([
      prisma.measurement.findMany({ orderBy: { date: "asc" } }),
      prisma.nutritionEntry.findMany({
        where: { date: today },
        orderBy: { createdAt: "asc" },
      }),
      prisma.foodShortcut.findMany({ orderBy: { useCount: "desc" }, take: 8 }),
      getNutritionTarget(iso),
      prisma.nutritionEntry.findMany({
        where: {
          date: {
            gte: new Date(today.getTime() - 6 * 86400000),
            lte: today,
          },
        },
      }),
    ]);

  const measurementSeries = measurements.map((m) => ({
    iso: isoOf(m.date),
    weightKg: m.weightKg != null ? num(m.weightKg) : null,
    waistCm: m.waistCm != null ? num(m.waistCm) : null,
    armLeftCm: m.armLeftCm != null ? num(m.armLeftCm) : null,
    thighLeftCm: m.thighLeftCm != null ? num(m.thighLeftCm) : null,
  }));

  // 7-day rolling bodyweight average.
  const bwRolling = measurementSeries.map((_, i, arr) => {
    const windowVals = arr
      .slice(Math.max(0, i - 6), i + 1)
      .map((x) => x.weightKg)
      .filter((v): v is number => v != null);
    return {
      iso: arr[i].iso,
      bw: windowVals.length
        ? Math.round((windowVals.reduce((a, b) => a + b, 0) / windowVals.length) * 10) / 10
        : null,
    };
  });

  // Weekly calorie bars (last 7 days).
  const calByDay = new Map<string, number>();
  for (const e of weekEntries) {
    const k = isoOf(e.date);
    calByDay.set(k, (calByDay.get(k) ?? 0) + e.calories);
  }
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * 86400000);
    const k = isoOf(d);
    return {
      day: new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short" }).format(d),
      calories: calByDay.get(k) ?? 0,
    };
  });
  const proteinWeek = weekEntries.reduce((t, e) => t + (e.proteinG ?? 0), 0);
  const daysWithFood = new Set(weekEntries.map((e) => isoOf(e.date))).size || 1;

  const totals = todayEntries.reduce(
    (t, e) => ({
      calories: t.calories + e.calories,
      protein: t.protein + (e.proteinG ?? 0),
      carbs: t.carbs + (e.carbsG ?? 0),
      fat: t.fat + (e.fatG ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return {
    iso,
    measurementSeries,
    bwRolling,
    latestMeasurement: measurements[measurements.length - 1] ?? null,
    todayEntries: todayEntries.map((e) => ({
      id: e.id,
      meal: e.meal,
      label: e.label,
      calories: e.calories,
      proteinG: e.proteinG,
    })),
    shortcuts: shortcuts.map((s) => ({
      id: s.id,
      label: s.label,
      calories: s.calories,
      proteinG: s.proteinG,
      carbsG: s.carbsG,
      fatG: s.fatG,
    })),
    target: target
      ? { calories: target.calories, proteinG: target.proteinG }
      : null,
    totals,
    week,
    avgProtein: Math.round(proteinWeek / daysWithFood),
  };
}

export type BodyData = Awaited<ReturnType<typeof getBodyData>>;
