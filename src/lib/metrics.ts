// The single home for derived numbers: e1RM, PRs, volume, adherence.
// Nothing here is stored; compute from SetLog/Session so there is one truth.
import { prisma } from "./prisma";
import { isoOf } from "./time";

/** Estimated 1RM, Epley. */
export function epley(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

/** Round to the nearest increment (2.5kg default). */
export function roundToIncrement(value: number, increment = 2.5): number {
  return Math.round(value / increment) * increment;
}

export function num(d: unknown): number {
  // Prisma Decimal | number | string -> number
  return typeof d === "number" ? d : Number(d ?? 0);
}

export type SetRow = {
  weightKg: number;
  reps: number;
  round: number;
  dropIndex: number;
};

/** Total tonnage (kg lifted) for a set of rows. */
export function tonnage(sets: SetRow[]): number {
  return sets.reduce((t, s) => t + s.weightKg * s.reps, 0);
}

/** Best e1RM across rows, and the row it came from. */
export function bestE1RM(sets: SetRow[]): { e1rm: number; from?: SetRow } {
  let best = 0;
  let from: SetRow | undefined;
  for (const s of sets) {
    const e = epley(s.weightKg, s.reps);
    if (e > best) {
      best = e;
      from = s;
    }
  }
  return { e1rm: best, from };
}

/** Per-exercise PR board: best e1RM and best single-set weight, with dates. */
export async function prBoard() {
  const logs = await prisma.setLog.findMany({
    include: { exercise: true, session: { select: { date: true } } },
    orderBy: { loggedAt: "asc" },
  });
  type PR = {
    exerciseId: string;
    name: string;
    bestE1RM: number;
    bestE1RMDate: string;
    bestWeight: number;
    bestWeightDate: string;
  };
  const map = new Map<string, PR>();
  for (const l of logs) {
    const w = num(l.weightKg);
    const e = epley(w, l.reps);
    const date = isoOf(l.session.date);
    const cur =
      map.get(l.exerciseId) ??
      ({
        exerciseId: l.exerciseId,
        name: l.exercise.name,
        bestE1RM: 0,
        bestE1RMDate: date,
        bestWeight: 0,
        bestWeightDate: date,
      } as PR);
    if (e > cur.bestE1RM) {
      cur.bestE1RM = e;
      cur.bestE1RMDate = date;
    }
    if (w > cur.bestWeight) {
      cur.bestWeight = w;
      cur.bestWeightDate = date;
    }
    map.set(l.exerciseId, cur);
  }
  return [...map.values()].sort((a, b) => b.bestE1RM - a.bestE1RM);
}

/** Round-1 (dropIndex 0) weight-over-time series for one exercise. */
export async function exerciseSeries(exerciseId: string) {
  const sessions = await prisma.session.findMany({
    where: { setLogs: { some: { exerciseId } }, completedAt: { not: null } },
    orderBy: { date: "asc" },
    include: {
      setLogs: {
        where: { exerciseId },
        orderBy: [{ round: "asc" }, { dropIndex: "asc" }],
      },
    },
  });
  return sessions.map((s) => {
    const rows: SetRow[] = s.setLogs.map((l) => ({
      weightKg: num(l.weightKg),
      reps: l.reps,
      round: l.round,
      dropIndex: l.dropIndex,
    }));
    const r1 = rows.find((r) => r.round === 1 && r.dropIndex === 0);
    const { e1rm } = bestE1RM(rows);
    return {
      date: isoOf(s.date),
      r1Weight: r1?.weightKg ?? null,
      r1Reps: r1?.reps ?? null,
      rounds: rows.filter((r) => r.dropIndex === 0),
      e1rm: Math.round(e1rm),
    };
  });
}

/**
 * The last working weight for an exercise — Round 1, dropIndex 0, most recent
 * completed session. Drives the ladder's target loads (loadPct × this).
 */
export async function lastWorkingWeight(
  exerciseId: string,
): Promise<{ weightKg: number; reps: number; date: string } | null> {
  const log = await prisma.setLog.findFirst({
    where: { exerciseId, round: 1, dropIndex: 0 },
    orderBy: { loggedAt: "desc" },
    include: { session: { select: { date: true } } },
  });
  if (!log) return null;
  return {
    weightKg: num(log.weightKg),
    reps: log.reps,
    date: isoOf(log.session.date),
  };
}

/** Reference numbers: the previous session's actual sets for an exercise. */
export async function lastSessionSets(
  exerciseId: string,
  beforeSessionId?: string,
) {
  const sessions = await prisma.session.findMany({
    where: {
      setLogs: { some: { exerciseId } },
      ...(beforeSessionId ? { id: { not: beforeSessionId } } : {}),
    },
    orderBy: { date: "desc" },
    take: 1,
    include: {
      setLogs: {
        where: { exerciseId },
        orderBy: [{ round: "asc" }, { dropIndex: "asc" }],
      },
    },
  });
  const s = sessions[0];
  if (!s) return null;
  return {
    date: isoOf(s.date),
    sets: s.setLogs.map((l) => ({
      round: l.round,
      dropIndex: l.dropIndex,
      weightKg: num(l.weightKg),
      reps: l.reps,
      side: l.side,
    })),
  };
}
