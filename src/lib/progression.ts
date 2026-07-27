// Round-1 progression rule (spec §5). Heavy days only:
// if Round 1 hit repMax in the two most recent sessions, suggest +2.5kg
// (upper-body isolation) or +5kg (compound / lower). Surfaced as a suggestion
// chip — never applied automatically.
import { prisma } from "./prisma";
import { num, roundToIncrement } from "./metrics";
import { isoOf } from "./time";

const LOWER_GROUPS = new Set(["quads", "hams", "glutes", "calves"]);
const COMPOUND_EQUIPMENT = new Set(["barbell", "kettlebell"]);

/** +5kg for compound/lower, +2.5kg for upper-body isolation. */
export function progressionStep(exercise: {
  muscleGroup: string;
  equipment: string;
  name: string;
}): number {
  const name = exercise.name.toLowerCase();
  const isCompoundName =
    /deadlift|squat|lunge|rdl|romanian|press\b/.test(name) &&
    !/lateral|extension|pushdown|fly|curl/.test(name);
  if (
    LOWER_GROUPS.has(exercise.muscleGroup) ||
    COMPOUND_EQUIPMENT.has(exercise.equipment) ||
    isCompoundName
  ) {
    return 5;
  }
  return 2.5;
}

export type Round1Suggestion = {
  last: { weightKg: number; reps: number; date: string };
  suggestedKg: number;
  reason: string;
} | null;

/**
 * @param exerciseId  the exercise on the ladder rung
 * @param round1RepMax the top of Round 1's rep range for this template
 */
export async function suggestRound1(
  exerciseId: string,
  round1RepMax: number,
): Promise<Round1Suggestion> {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
  });
  if (!exercise) return null;

  // Two most recent heavy-day Round-1 logs for this exercise.
  const logs = await prisma.setLog.findMany({
    where: {
      exerciseId,
      round: 1,
      dropIndex: 0,
      session: { template: { intent: "heavy" }, completedAt: { not: null } },
    },
    orderBy: { loggedAt: "desc" },
    take: 2,
    include: { session: { select: { date: true } } },
  });
  if (logs.length === 0) return null;

  const last = {
    weightKg: num(logs[0].weightKg),
    reps: logs[0].reps,
    date: isoOf(logs[0].session.date),
  };

  const hitMaxBoth =
    logs.length >= 2 && logs.every((l) => l.reps >= round1RepMax);
  if (!hitMaxBoth) {
    return { last, suggestedKg: last.weightKg, reason: "hold" };
  }

  const step = progressionStep(exercise);
  return {
    last,
    suggestedKg: roundToIncrement(last.weightKg + step),
    reason: `Hit ${round1RepMax} reps two sessions running — try +${step}kg`,
  };
}
