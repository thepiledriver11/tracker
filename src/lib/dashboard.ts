// Aggregations for the Dashboard screen. All read-only, computed from logs.
import { prisma } from "./prisma";
import { num, epley, tonnage } from "./metrics";
import { isoOf, dateOnly } from "./time";
import { getActiveProgram } from "./queries";

/** Six main lifts the e1RM index normalises across. */
const MAIN_LIFTS = [
  "Dumbbell press",
  "Lat pulldown",
  "Machine row (undergrip)",
  "Single-leg Smith squat",
  "Romanian deadlift",
  "Machine shoulder press",
];

export async function dashboardData() {
  const program = await getActiveProgram();
  const weeks = program?.weeks ?? [];

  const sessions = await prisma.session.findMany({
    where: { completedAt: { not: null } },
    include: { template: true, setLogs: true },
    orderBy: { date: "asc" },
  });
  const walks = await prisma.walk.findMany();
  const nutrition = await prisma.nutritionEntry.findMany();
  const measurements = await prisma.measurement.findMany({
    where: { weightKg: { not: null } },
    orderBy: { date: "asc" },
  });

  // Adherence heatmap: 12 weeks × 7 days, keyed by week start.
  const loggedByDate = new Map<string, { session: boolean; walk: boolean }>();
  for (const s of sessions) {
    const k = isoOf(s.date);
    loggedByDate.set(k, { ...(loggedByDate.get(k) ?? { session: false, walk: false }), session: true });
  }
  for (const w of walks) {
    const k = isoOf(w.date);
    loggedByDate.set(k, { ...(loggedByDate.get(k) ?? { session: false, walk: false }), walk: true });
  }
  const heatmap = weeks.map((wk) => {
    const start = wk.startDate.getTime();
    const days = Array.from({ length: 7 }, (_, i) => {
      const iso = isoOf(new Date(start + i * 86400000));
      const rec = loggedByDate.get(iso);
      let state: 0 | 1 | 2 | 3 = 0;
      if (rec?.session && rec?.walk) state = 3;
      else if (rec?.session) state = 1;
      else if (rec?.walk) state = 2;
      return { iso, state };
    });
    return { week: wk.weekNumber, block: wk.block, days };
  });

  // Weekly tonnage, split heavy vs volume.
  const tonnageByWeek = new Map<number, { heavy: number; volume: number }>();
  const e1rmByWeek = new Map<number, Map<string, number>>();
  for (const s of sessions) {
    const wk = weekNumberFor(weeks, s.date);
    if (wk == null) continue;
    const rows = s.setLogs.map((l) => ({
      weightKg: num(l.weightKg),
      reps: l.reps,
      round: l.round,
      dropIndex: l.dropIndex,
    }));
    const vol = tonnage(rows);
    const bucket = tonnageByWeek.get(wk) ?? { heavy: 0, volume: 0 };
    if (s.template?.intent === "volume") bucket.volume += vol;
    else bucket.heavy += vol;
    tonnageByWeek.set(wk, bucket);

    // e1RM per main lift per week (best).
    for (const l of s.setLogs) {
      const e = epley(num(l.weightKg), l.reps);
      const wkMap = e1rmByWeek.get(wk) ?? new Map<string, number>();
      // store by exerciseId later resolved to name via a lookup below
      wkMap.set(l.exerciseId, Math.max(wkMap.get(l.exerciseId) ?? 0, e));
      e1rmByWeek.set(wk, wkMap);
    }
  }

  const tonnageSeries = weeks.map((wk) => ({
    week: wk.weekNumber,
    heavy: Math.round(tonnageByWeek.get(wk.weekNumber)?.heavy ?? 0),
    volume: Math.round(tonnageByWeek.get(wk.weekNumber)?.volume ?? 0),
  }));

  // e1RM index: normalise each main lift to its first non-zero week = 100.
  const mainIds = await prisma.exercise.findMany({
    where: { name: { in: MAIN_LIFTS } },
    select: { id: true, name: true },
  });
  const baseline = new Map<string, number>();
  const e1rmIndex = weeks.map((wk) => {
    const wkMap = e1rmByWeek.get(wk.weekNumber);
    let sum = 0;
    let count = 0;
    for (const m of mainIds) {
      const e = wkMap?.get(m.id);
      if (e && e > 0) {
        if (!baseline.has(m.id)) baseline.set(m.id, e);
        const base = baseline.get(m.id)!;
        sum += (e / base) * 100;
        count++;
      }
    }
    return { week: wk.weekNumber, index: count ? Math.round(sum / count) : null };
  });

  // Bodyweight vs calories — 7-day averages by date.
  const calByDate = new Map<string, number>();
  for (const n of nutrition) {
    const k = isoOf(n.date);
    calByDate.set(k, (calByDate.get(k) ?? 0) + n.calories);
  }
  const bwVsCals = rollingDual(measurements.map((m) => ({ iso: isoOf(m.date), bw: num(m.weightKg) })), calByDate);

  // Walk minutes per week.
  const walkByWeek = new Map<number, number>();
  for (const w of walks) {
    const wk = weekNumberFor(weeks, w.date);
    if (wk == null) continue;
    walkByWeek.set(wk, (walkByWeek.get(wk) ?? 0) + w.minutes);
  }
  const walkSeries = weeks.map((wk) => ({
    week: wk.weekNumber,
    minutes: walkByWeek.get(wk.weekNumber) ?? 0,
    block: wk.block,
  }));

  return {
    hasData: sessions.length > 0 || walks.length > 0 || measurements.length > 0,
    heatmap,
    tonnageSeries,
    e1rmIndex,
    bwVsCals,
    walkSeries,
  };
}

function weekNumberFor(
  weeks: { weekNumber: number; startDate: Date }[],
  date: Date,
): number | null {
  const t = date.getTime();
  for (const w of weeks) {
    const start = w.startDate.getTime();
    if (t >= start && t < start + 7 * 86400000) return w.weekNumber;
  }
  return null;
}

/** 7-day rolling averages of bodyweight and calories, aligned by date. */
function rollingDual(
  bw: { iso: string; bw: number }[],
  calByDate: Map<string, number>,
) {
  const dates = new Set<string>([...bw.map((b) => b.iso), ...calByDate.keys()]);
  const sorted = [...dates].sort();
  const bwMap = new Map(bw.map((b) => [b.iso, b.bw]));
  const out: { iso: string; bw: number | null; cals: number | null }[] = [];
  for (const iso of sorted) {
    const end = dateOnly(iso).getTime();
    const window = sorted.filter((d) => {
      const t = dateOnly(d).getTime();
      return t <= end && t > end - 7 * 86400000;
    });
    const bwVals = window.map((d) => bwMap.get(d)).filter((v): v is number => v != null);
    const calVals = window.map((d) => calByDate.get(d)).filter((v): v is number => v != null);
    out.push({
      iso,
      bw: bwVals.length ? Math.round((bwVals.reduce((a, b) => a + b, 0) / bwVals.length) * 10) / 10 : null,
      cals: calVals.length ? Math.round(calVals.reduce((a, b) => a + b, 0) / calVals.length) : null,
    });
  }
  return out;
}
